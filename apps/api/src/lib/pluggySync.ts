// Grava no banco o que o Pluggy devolve pra um item (conexão) — usado tanto pelo webhook
// (`item/created`, `item/updated`, `transactions/*`) quanto pelo "Atualizar agora" manual
// (CONTEXTO.md §6.2, §6.3 passo 1 — dedup por id externo). O resto do pipeline (nome do
// estabelecimento, categoria, agregados) roda depois, no job `process-transactions`.
import { eq, sql } from 'drizzle-orm';
import { accounts, connections, creditCards, institutions, transactions } from '@planor/db';
import { currentBillCents } from '@planor/shared';
import type { connectionStatusEnum } from '@planor/db';
import { enqueueProcessTransactions } from '../jobs/queue';
import { alertOnStatusChange } from '../services/connectionJobs';
import { db } from './db';
import { getItem, listAccounts, listTransactions, type PluggyAccount, type PluggyItem, type PluggyTransaction } from './pluggy';

type ConnectionStatus = (typeof connectionStatusEnum.enumValues)[number];

/** Lançado quando o item do Pluggy não pertence a `userId` — nunca deixar passar em silêncio:
 * seria um usuário vendo (ou escrevendo por cima d)o banco de outra pessoa. */
export class PluggyOwnershipError extends Error {}

function mapAccountType(account: PluggyAccount): 'checking' | 'savings' | 'credit_card' {
  if (account.type === 'CREDIT') return 'credit_card';
  return account.subtype === 'SAVINGS_ACCOUNT' ? 'savings' : 'checking';
}

/** Valor no padrão do banco (gasto negativo). Usa o `type` explícito (DEBIT/CREDIT) em vez do
 * sinal do valor — o sinal do Pluggy varia por tipo de conta (confirmado diferente em cartão de
 * crédito) e o type não. */
function transactionCents(tx: PluggyTransaction): number {
  const cents = Math.abs(Math.round(tx.amount * 100));
  return tx.type === 'DEBIT' ? -cents : cents;
}

function mapConnectionStatus(item: PluggyItem): ConnectionStatus {
  if (item.consentExpiresAt && new Date(item.consentExpiresAt).getTime() < Date.now()) return 'consent_expired';
  if (item.executionStatus === 'SUCCESS' || item.executionStatus === 'PARTIAL_SUCCESS') return 'connected';
  return 'error';
}

async function upsertInstitution(connector: PluggyItem['connector']) {
  const aggregatorId = String(connector.id);
  const [existing] = await db.select().from(institutions).where(eq(institutions.aggregatorId, aggregatorId));
  if (existing) return existing;

  const [created] = await db
    .insert(institutions)
    .values({ name: connector.name, logo: connector.imageUrl, aggregatorId })
    .onConflictDoNothing({ target: institutions.aggregatorId })
    .returning();
  if (created) return created;

  const [raceWinner] = await db.select().from(institutions).where(eq(institutions.aggregatorId, aggregatorId));
  return raceWinner!;
}

/** Cria ou atualiza a `connections` + `accounts` (+ `credit_cards`) a partir de um item do
 * Pluggy, e importa as transações de cada conta. Idempotente — pode rodar de novo sem duplicar
 * (índices únicos em `aggregator_item_id`, `external_id` e `(account_id, external_id)`). */
export async function syncItem(userId: string, itemId: string): Promise<{ connectionId: string; accountsSynced: number; transactionsImported: number }> {
  const item = await getItem(itemId);

  // `clientUserId` é o que a gente mesmo definiu ao criar o connect token (ver `/connections/token`
  // em routes/connections.ts) — o Pluggy devolve de volta no item, e é a prova de que esse item
  // foi aberto por este usuário. Sem isso batendo, não sincroniza de jeito nenhum: um `itemId`
  // de outra pessoa (adivinhado, vazado, ou só um ID antigo) nunca pode gravar dados bancários
  // de alguém na conta de outro usuário.
  if (item.clientUserId !== userId) {
    throw new PluggyOwnershipError(`Item ${itemId} não pertence ao usuário ${userId}.`);
  }

  // Segunda trava, redundante de propósito: se esse item já tem uma `connections` registrada
  // pra outro usuário no nosso banco, recusa mesmo que o `clientUserId` acima (por algum motivo)
  // tivesse batido.
  const [existingForAnyUser] = await db.select().from(connections).where(eq(connections.aggregatorItemId, item.id));
  if (existingForAnyUser && existingForAnyUser.userId !== userId) {
    throw new PluggyOwnershipError(`Item ${itemId} já está associado a outro usuário.`);
  }

  const institution = await upsertInstitution(item.connector);

  const [existingConnection] = await db.select().from(connections).where(eq(connections.aggregatorItemId, item.id));
  const connectionValues = {
    userId,
    institutionId: institution.id,
    aggregatorItemId: item.id,
    status: mapConnectionStatus(item),
    consentExpiresAt: item.consentExpiresAt ? new Date(item.consentExpiresAt) : null,
    authorizedAt: new Date(item.createdAt),
    lastSyncAt: new Date(),
    errorCode: item.error?.code ?? null,
  };

  const connection = existingConnection
    ? (await db.update(connections).set(connectionValues).where(eq(connections.id, existingConnection.id)).returning())[0]!
    : (await db.insert(connections).values(connectionValues).returning())[0]!;

  await alertOnStatusChange({
    userId,
    connectionId: connection.id,
    institutionName: institution.name,
    previous: existingConnection?.status ?? null,
    next: connection.status,
    errorCode: connection.errorCode,
  });

  const pluggyAccounts = await listAccounts(item.id);
  let transactionsImported = 0;

  for (const pluggyAccount of pluggyAccounts) {
    const [existingAccount] = await db.select().from(accounts).where(eq(accounts.externalId, pluggyAccount.id));
    const accountValues = {
      connectionId: connection.id,
      userId,
      type: mapAccountType(pluggyAccount),
      name: pluggyAccount.name,
      balanceCents: Math.round(pluggyAccount.balance * 100),
      currency: pluggyAccount.currencyCode,
      externalId: pluggyAccount.id,
    };

    const account = existingAccount
      ? (await db.update(accounts).set(accountValues).where(eq(accounts.id, existingAccount.id)).returning())[0]!
      : (await db.insert(accounts).values(accountValues).returning())[0]!;

    const pluggyTransactions = await listTransactions(pluggyAccount.id);

    if (pluggyAccount.type === 'CREDIT' && pluggyAccount.creditData) {
      const { creditLimit, balanceCloseDate, balanceDueDate } = pluggyAccount.creditData;
      // `.getUTCDate()`, não `.getDate()` — "2026-10-20" vira meia-noite UTC, e `.getDate()` lê no
      // fuso local da máquina (America/Sao_Paulo, -03:00), o que vira dia 19 por engano.
      const creditCardValues = {
        closingDay: balanceCloseDate ? new Date(balanceCloseDate).getUTCDate() : 1,
        dueDay: balanceDueDate ? new Date(balanceDueDate).getUTCDate() : 10,
        limitCents: creditLimit ? Math.round(creditLimit * 100) : null,
        // O saldo da conta de crédito no Pluggy é o limite usado, não a fatura (ver
        // `currentBillCents` em packages/shared).
        currentBillCents: currentBillCents(
          accountValues.balanceCents,
          pluggyTransactions.map((tx) => ({
            billMonth: tx.creditCardMetadata?.billForecastDate ?? null,
            billId: tx.creditCardMetadata?.billId ?? null,
            amountCents: -transactionCents(tx), // aqui gasto é positivo
          })),
        ),
      };
      await db
        .insert(creditCards)
        .values({ accountId: account.id, ...creditCardValues })
        .onConflictDoUpdate({ target: creditCards.accountId, set: creditCardValues });
    }

    for (const tx of pluggyTransactions) {
      const metadata = tx.creditCardMetadata;
      const installment = {
        installmentNumber: metadata?.installmentNumber ?? null,
        installmentCount: metadata?.totalInstallments ?? null,
        billMonth: metadata?.billForecastDate ?? null,
      };
      // Transação que já existe só tem os dados da parcela/fatura atualizados (o resto — nome,
      // categoria, nota — pode ter sido mexido pelo pipeline ou pelo usuário). `xmax = 0` só é
      // verdade em linha recém-inserida: é assim que separa "importada agora" de "atualizada".
      const [row] = await db
        .insert(transactions)
        .values({
          userId,
          accountId: account.id,
          externalId: tx.id,
          postedAt: new Date(tx.date),
          amountCents: transactionCents(tx),
          descriptionRaw: tx.descriptionRaw ?? tx.description,
          merchantName: tx.description,
          ...installment,
        })
        .onConflictDoUpdate({
          target: [transactions.accountId, transactions.externalId],
          set: installment,
          setWhere: sql`(${transactions.installmentNumber}, ${transactions.installmentCount}, ${transactions.billMonth}) is distinct from (excluded.installment_number, excluded.installment_count, excluded.bill_month)`,
        })
        .returning({ inserted: sql<boolean>`(xmax = 0)` });
      if (row?.inserted) transactionsImported += 1;
    }
  }

  // Sempre, mesmo sem transação nova: o saldo/conta pode ter mudado, e o job é barato e idempotente.
  await enqueueProcessTransactions(userId);

  return { connectionId: connection.id, accountsSynced: pluggyAccounts.length, transactionsImported };
}
