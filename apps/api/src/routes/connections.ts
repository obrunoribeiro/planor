// Conexão bancária (Open Finance / Pluggy), importação de fatura e webhooks — CONTEXTO.md §6.2, §8.
import { and, eq } from 'drizzle-orm';
import { accounts, transactions } from '@planor/db';
import { parseOfx } from '@planor/shared';
import type { FastifyInstance } from 'fastify';
import { requireUserId } from '../lib/auth';
import { db } from '../lib/db';
import { notImplemented } from '../lib/stub';

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
  app.post('/connections/token', async (_req, reply) =>
    notImplemented(reply, 'connectToken do agregador — Fase 2 (§6.2)'),
  );
  app.get('/connections', async (_req, reply) => notImplemented(reply, 'Listar conexões — Fase 2 (§6.2)'));
  app.post('/connections/:id/sync', async (_req, reply) =>
    notImplemented(reply, 'Atualizar agora — Fase 2 (§6.2)'),
  );
  app.delete('/connections/:id', async (_req, reply) =>
    notImplemented(reply, 'Desconectar (revoga consentimento) — Fase 2 (§6.2)'),
  );

  app.post('/webhooks/aggregator', async (_req, reply) =>
    notImplemented(reply, 'item/created, item/updated, item/error, transactions/* — Fase 2 (§6.2)'),
  );
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

    return reply.code(201).send({ total: parsed.length, imported, duplicates: parsed.length - imported });
  });
}
