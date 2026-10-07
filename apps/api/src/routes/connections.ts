// Conexão bancária (Open Finance / Pluggy), importação de fatura e webhooks — CONTEXTO.md §6.2, §8.
import type { FastifyInstance } from 'fastify';
import { notImplemented } from '../lib/stub';

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

  app.post('/imports', async (_req, reply) =>
    notImplemented(reply, 'Upload de PDF/OFX → job de extração — Fase 2 (§6.2)'),
  );
}
