// Conexão bancária (Open Finance / Pluggy), importação de fatura e webhooks — CONTEXTO.md §6.2, §8.
import { and, asc, eq } from 'drizzle-orm';
import { accounts, connections, creditCards, institutions, transactions } from '@planor/db';
import { parseOfx } from '@planor/shared';
import type { FastifyInstance } from 'fastify';
import { env } from '../env';
import { requireUserId } from '../lib/auth';
import { db } from '../lib/db';
import { enqueueProcessTransactions, enqueueSyncConnection } from '../jobs/queue';
import { createConnectToken, deleteItem } from '../lib/pluggy';
import { PluggyOwnershipError, syncItem } from '../lib/pluggySync';
import { notImplemented } from '../lib/stub';

type PluggyWebhookPayload = {
  event: string;
  eventId?: string;
  itemId?: string;
  clientUserId?: string;
};

/** Limpeza mecânica da descrição crua do banco (§6.3, passo 1) — só espaço e maiúsculas, sem
 * dicionário de comerciante/IA (isso é a Fase 3, ver PROGRESSO.md). */
function normalizeDescription(raw: string): string {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  return cleaned
    .toLowerCase()
    .split(' ')
    .map((word) => (word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export async function connectionRoutes(app: FastifyInstance) {
  app.post('/connections/token', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    // `connectionId` presente = reconectar um banco que já existe (consentimento vencido ou erro,
    // §6.2 "Renovar acesso"). Recebe o id da nossa `connections`, não o `itemId` do Pluggy, pra
    // garantir que só dá pra abrir o widget em modo de atualização num item que é do usuário.
    const { connectionId } = (request.body as { connectionId?: string } | null) ?? {};
    let itemId: string | undefined;
    if (connectionId) {
      const [connection] = await db
        .select({ aggregatorItemId: connections.aggregatorItemId })
        .from(connections)
        .where(and(eq(connections.id, connectionId), eq(connections.userId, userId)));
      if (!connection) return reply.code(404).send({ error: 'connection_not_found' });
      itemId = connection.aggregatorItemId;
    }

    try {
      const accessToken = await createConnectToken({ itemId, clientUserId: userId });
      return { accessToken };
    } catch (err) {
      app.log.error(err, 'falha ao criar connect token do Pluggy');
      return reply.code(502).send({ error: 'pluggy_unavailable' });
    }
  });

  // Chamado pelo app logo depois do `onSuccess` do widget Pluggy Connect — não depende do
  // webhook ter chegado ainda (em dev, o ngrok pode não estar registrado, ou demorar). O webhook
  // continua sendo o jeito de manter sincronizado depois disso (atualização automática, §6.2).
  app.post('/connections/sync-item', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const { itemId } = (request.body as { itemId?: string } | null) ?? {};
    if (!itemId) return reply.code(400).send({ error: 'item_id_missing' });

    try {
      return await syncItem(userId, itemId);
    } catch (err) {
      if (err instanceof PluggyOwnershipError) {
        app.log.warn({ err, userId, itemId }, 'tentativa de sincronizar item que não pertence a este usuário');
        return reply.code(403).send({ error: 'item_not_owned' });
      }
      app.log.error(err, 'falha ao sincronizar item recém-conectado do Pluggy');
      return reply.code(502).send({ error: 'pluggy_unavailable' });
    }
  });

  app.get('/connections', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const rows = await db
      .select({
        id: connections.id,
        status: connections.status,
        authorizedAt: connections.authorizedAt,
        consentExpiresAt: connections.consentExpiresAt,
        lastSyncAt: connections.lastSyncAt,
        errorCode: connections.errorCode,
        institutionName: institutions.name,
        institutionLogo: institutions.logo,
      })
      .from(connections)
      .innerJoin(institutions, eq(institutions.id, connections.institutionId))
      .where(eq(connections.userId, userId))
      .orderBy(asc(institutions.name));

    // Contas e cartões de cada conexão (§6.10: "lista por banco, com saldo da conta e fatura do
    // cartão"). No cartão, `balance_cents` é o limite usado; a fatura vem de `credit_cards`.
    const accountRows = await db
      .select({
        id: accounts.id,
        connectionId: accounts.connectionId,
        type: accounts.type,
        name: accounts.name,
        balanceCents: accounts.balanceCents,
        currentBillCents: creditCards.currentBillCents,
      })
      .from(accounts)
      .leftJoin(creditCards, eq(creditCards.accountId, accounts.id))
      .where(eq(accounts.userId, userId))
      .orderBy(asc(accounts.type));

    // Ativos primeiro, depois os que pedem ação (erro, consentimento vencido), por último os
    // desconectados — que continuam na lista porque o histórico deles segue no app (§6.2).
    const statusOrder: Record<(typeof rows)[number]['status'], number> = { connected: 0, error: 1, consent_expired: 2, disconnected: 3 };
    rows.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return rows.map((row) => ({
      ...row,
      accounts: accountRows.filter((account) => account.connectionId === row.id)
        .map((account) => ({
          id: account.id,
          type: account.type,
          name: account.name,
          balanceCents: account.balanceCents,
          currentBillCents: account.currentBillCents,
        })),
    }));
  });

  app.post('/connections/:id/sync', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const { id } = request.params as { id: string };

    const [connection] = await db.select().from(connections).where(and(eq(connections.id, id), eq(connections.userId, userId)));
    if (!connection) return reply.code(404).send({ error: 'connection_not_found' });

    try {
      return await syncItem(userId, connection.aggregatorItemId);
    } catch (err) {
      if (err instanceof PluggyOwnershipError) {
        app.log.error({ err, userId, connectionId: id }, 'conexão já verificada como do usuário, mas syncItem recusou — investigar');
        return reply.code(403).send({ error: 'item_not_owned' });
      }
      app.log.error(err, 'falha ao sincronizar conexão manualmente');
      return reply.code(502).send({ error: 'pluggy_unavailable' });
    }
  });

  app.delete('/connections/:id', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const { id } = request.params as { id: string };

    const [connection] = await db.select().from(connections).where(and(eq(connections.id, id), eq(connections.userId, userId)));
    if (!connection) return reply.code(404).send({ error: 'connection_not_found' });

    try {
      await deleteItem(connection.aggregatorItemId);
    } catch (err) {
      app.log.error(err, 'falha ao desconectar item no Pluggy — marcando desconectado localmente mesmo assim');
    }

    await db.update(connections).set({ status: 'disconnected' }).where(eq(connections.id, id));
    return reply.code(204).send();
  });

  app.post('/webhooks/aggregator', async (request, reply) => {
    // O Pluggy não assina o payload do webhook — esse header customizado (definido por nós ao
    // registrar o webhook, ver lib/pluggy.ts `registerWebhook`) é a única verificação possível.
    if (env.PLUGGY_WEBHOOK_SECRET && request.headers['x-planor-webhook-secret'] !== env.PLUGGY_WEBHOOK_SECRET) {
      return reply.code(401).send({ error: 'invalid_webhook_secret' });
    }

    const payload = request.body as PluggyWebhookPayload;
    app.log.info({ event: payload?.event, itemId: payload?.itemId }, 'webhook do Pluggy recebido');

    // Só enfileira (§8: "enfileira jobs") e responde na hora — a sincronização roda no job
    // `sync-connection`. Só eventos item/* trazem `clientUserId`; transactions/* e connector/*
    // ainda são só confirmados (ver PROGRESSO.md, "Decisões diferentes").
    if (payload?.itemId && payload.clientUserId && payload.event?.startsWith('item')) {
      try {
        await enqueueSyncConnection({ userId: payload.clientUserId, itemId: payload.itemId });
      } catch (err) {
        app.log.error(err, 'falha ao enfileirar sincronização do Pluggy a partir do webhook');
        return reply.code(500).send({ error: 'queue_unavailable' }); // Pluggy tenta de novo
      }
    }

    return reply.code(200).send({ received: true });
  });

  app.post('/webhooks/revenuecat', async (_req, reply) =>
    notImplemented(reply, 'Entitlement do RevenueCat — Fase 4 (§6.15)'),
  );

  app.post('/imports', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'file_missing' });

    const accountId = (file.fields.accountId as { value?: string } | undefined)?.value;
    if (!accountId) return reply.code(400).send({ error: 'account_id_missing' });

    const [account] = await db.select().from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
    if (!account) return reply.code(404).send({ error: 'account_not_found' });

    const isOfx = /\.ofx$/i.test(file.filename) || file.mimetype.includes('ofx');
    if (!isOfx) {
      // PDF exige extrair texto + LLM pra estruturar em JSON (§6.2) — provedor de IA final ainda
      // é decisão em aberto (CONTEXTO.md §15.6). Não implementado ainda, ver PROGRESSO.md.
      return reply.code(501).send({ error: 'pdf_not_implemented', note: 'Importar fatura em PDF ainda não existe — só OFX por enquanto.' });
    }

    const buffer = await file.toBuffer();
    const parsed = parseOfx(buffer.toString('utf-8'));
    if (parsed.length === 0) {
      return reply.code(422).send({ error: 'no_transactions_found', note: 'Não achamos nenhuma transação válida nesse arquivo.' });
    }

    let imported = 0;
    for (const tx of parsed) {
      const descriptionRaw = normalizeDescription(tx.descriptionRaw);
      const [inserted] = await db
        .insert(transactions)
        .values({
          userId,
          accountId,
          externalId: tx.externalId,
          postedAt: tx.postedAt,
          amountCents: tx.amountCents,
          descriptionRaw,
          merchantName: descriptionRaw,
        })
        .onConflictDoNothing({ target: [transactions.accountId, transactions.externalId] })
        .returning();
      if (inserted) imported += 1;
    }

    if (imported > 0) await enqueueProcessTransactions(userId);

    return reply.code(201).send({ total: parsed.length, imported, duplicates: parsed.length - imported });
  });
}
