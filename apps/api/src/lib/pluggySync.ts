// Grava no banco o que o Pluggy devolve pra um item (conexão) — usado tanto pelo webhook
// (`item/created`, `item/updated`, `transactions/*`) quanto pelo "Atualizar agora" manual
// (CONTEXTO.md §6.2, §6.3 passo 1 — normalização/dedup; passo 9, recalcular agregados, NÃO
// acontece aqui ainda, ver PROGRESSO.md).
import { eq } from 'drizzle-orm';
import { accounts, connections, creditCards, institutions, transactions } from '@planor/db';
import type { connectionStatusEnum } from '@planor/db';
import { db } from './db';
import { getItem, listAccounts, listTransactions, type PluggyAccount, type PluggyItem } from './pluggy';

type ConnectionStatus = (typeof connectionStatusEnum.enumValues)[number];

function mapAccountType(account: PluggyAccount): 'checking' | 'savings' | 'credit_card' {
  if (account.type === 'CREDIT') return 'credit_card';
  return account.subtype === 'SAVINGS_ACCOUNT' ? 'savings' : 'checking';
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
  const institution = await upsertInstitution(item.connector);

  const [existingConnection] = await db.select().from(connections).where(eq(connections.aggregatorItemId, item.id));
  const connectionValues = {
    userId,
    institutionId: institution.id,
    aggregatorItemId: item.id,
    status: mapConnectionStatus(item),
    consentExpiresAt: item.consentExpiresAt ? new Date(item.consentExpiresAt) : null,
    lastSyncAt: new Date(),
    errorCode: item.error?.code ?? null,
  };

  const connection = existingConnection
    ? (await db.update(connections).set(connectionValues).where(eq(connections.id, existingConnection.id)).returning())[0]!
    : (await db.insert(connections).values(connectionValues).returning())[0]!;

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

    if (pluggyAccount.type === 'CREDIT' && pluggyAccount.creditData) {
      const { creditLimit, balanceCloseDate, balanceDueDate } = pluggyAccount.creditData;
      // `.getUTCDate()`, não `.getDate()` — "2026-10-20" vira meia-noite UTC, e `.getDate()` lê no
      // fuso local da máquina (America/Sao_Paulo, -03:00), o que vira dia 19 por engano.
      const creditCardValues = {
        closingDay: balanceCloseDate ? new Date(balanceCloseDate).getUTCDate() : 1,
        dueDay: balanceDueDate ? new Date(balanceDueDate).getUTCDate() : 10,
        limitCents: creditLimit ? Math.round(creditLimit * 100) : null,
      };
      await db
        .insert(creditCards)
        .values({ accountId: account.id, ...creditCardValues })
        .onConflictDoUpdate({ target: creditCards.accountId, set: creditCardValues });
    }

    const pluggyTransactions = await listTransactions(pluggyAccount.id);
    for (const tx of pluggyTransactions) {
      // Usa o `type` explícito (DEBIT/CREDIT) em vez do sinal do valor — o sinal do Pluggy varia
      // por tipo de conta (confirmado diferente em cartão de crédito) e o type não.
      const signedAmountCents = tx.type === 'DEBIT' ? -Math.abs(Math.round(tx.amount * 100)) : Math.abs(Math.round(tx.amount * 100));

      const [inserted] = await db
        .insert(transactions)
        .values({
          userId,
          accountId: account.id,
          externalId: tx.id,
          postedAt: new Date(tx.date),
          amountCents: signedAmountCents,
          descriptionRaw: tx.descriptionRaw ?? tx.description,
          merchantName: tx.description,
        })
        .onConflictDoNothing({ target: [transactions.accountId, transactions.externalId] })
        .returning();
      if (inserted) transactionsImported += 1;
    }
  }

  return { connectionId: connection.id, accountsSynced: pluggyAccounts.length, transactionsImported };
}
