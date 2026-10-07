// Retrospectiva do mês e indique-e-ganhe — CONTEXTO.md §6.13, §6.14, §8.
import type { FastifyInstance } from 'fastify';
import { notImplemented } from '../lib/stub';

export async function growthRoutes(app: FastifyInstance) {
  app.get('/recaps/:month', async (_req, reply) =>
    notImplemented(reply, 'Retrospectiva do mês — Fase 5 (§6.13)'),
  );
  app.get('/referrals/me', async (_req, reply) =>
    notImplemented(reply, 'Código, convites e recompensas — Fase 5 (§6.14)'),
  );
}
