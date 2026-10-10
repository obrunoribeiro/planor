// Conexão bancária (Open Finance / Pluggy), importação de fatura e webhooks — CONTEXTO.md §6.2, §8.
import { and, eq, inArray } from 'drizzle-orm';
import { accounts, connections, institutions, transactions } from '@planor/db';
import { daysUntilSaoPaulo, parseOfx } from '@planor/shared';
import type { FastifyInstance } from 'fastify';
import { env } from '../env';
import { requireUserId } from '../lib/auth';
import { db } from '../lib/db';
import { enqueueProcessTransactions, enqueueSyncConnection, SYNC_READ_DELAY_SECONDS } from '../jobs/queue';
import { createConnectToken, deleteItem, requestItemRefresh } from '../lib/pluggy';
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

    // `connectionId` = renovar/reconectar uma conexão existente (widget em modo atualização,
    // §6.2). Recebe o id NOSSO e resolve o item do Pluggy aqui, filtrando pelo usuário — nunca um
    // `itemId` cru do cliente, que deixaria abrir o widget sobre o item de outra pessoa.
    const { connectionId } = (request.body as { connectionId?: string } | null) ?? {};
    let itemId: string | undefined;
    if (connectionId) {
      const [connection] = await db
        .select({ itemId: connections.aggregatorItemId })
        .from(connections)
        .where(and(eq(connections.id, connectionId), eq(connections.userId, userId)));
      if (!connection) return reply.code(404).send({ error: 'connection_not_found' });
      itemId = connection.itemId;
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

  // Contas e cartões (§6.10): cada conexão com as contas dela. Pro cartão, `balanceCents` é a
  // fatura atual (o Pluggy devolve o saldo devedor do cartão como `balance`). `consentDaysLeft`
  // usa a mesma regra do job `consent-expiry-check` (dias de calendário em America/Sao_Paulo) —
  // o app só exibe.
  app.get('/connections', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const rows = await db
      .select({
        id: connections.id,
        status: connections.status,
        consentExpiresAt: connections.consentExpiresAt,
        lastSyncAt: connections.lastSyncAt,
        errorCode: connections.errorCode,
        institutionName: institutions.name,
        institutionLogo: institutions.logo,
      })
      .from(connections)
      .innerJoin(institutions, eq(institutions.id, connections.institutionId))
      .where(eq(connections.userId, userId))
      .orderBy(institutions.name);

    const accountRows = rows.length
      ? await db
          .select({
            id: accounts.id,
            connectionId: accounts.connectionId,
            type: accounts.type,
            name: accounts.name,
            balanceCents: accounts.balanceCents,
          })
          .from(accounts)
          .where(and(eq(accounts.userId, userId), inArray(accounts.connectionId, rows.map((r) => r.id))))
      : [];

    const now = new Date();
    return rows.map((row) => ({
      ...row,
      consentDaysLeft: row.consentExpiresAt ? daysUntilSaoPaulo(row.consentExpiresAt, now) : null,
      // Conta corrente/poupança primeiro, cartão depois — a ordem do card no Figma.
      accounts: accountRows
        .filter((a) => a.connectionId === row.id)
        .sort((a, b) => Number(a.type === 'credit_card') - Number(b.type === 'credit_card'))
        .map(({ connectionId: _connectionId, ...account }) => account),
    }));
  });

  app.post('/connections/:id/sync', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const { id } = request.params as { id: string };

    const [connection] = await db.select().from(connections).where(and(eq(connections.id, id), eq(connections.userId, userId)));
    if (!connection) return reply.code(404).send({ error: 'connection_not_found' });

    // "Atualizar agora" (§6.2): pede dado novo ao banco, devolve na hora o que o Pluggy já tem e
    // agenda uma segunda leitura pra quando a atualização terminar do lado deles.
    let refreshRequested = false;
    try {
      refreshRequested = (await requestItemRefresh(connection.aggregatorItemId)) === 'requested';
    } catch (err) {
      app.log.warn({ err, connectionId: id }, 'Pluggy recusou pedido de atualização — lendo o que já existe');
    }

    try {
      const result = await syncItem(userId, connection.aggregatorItemId);
      if (refreshRequested) {
        await enqueueSyncConnection({ userId, itemId: connection.aggregatorItemId }, { startAfterSeconds: SYNC_READ_DELAY_SECONDS });
      }
      return { ...result, refreshRequested };
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
