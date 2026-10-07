// Metas pessoais e em grupo — CONTEXTO.md §6.8, §8.
import type { FastifyInstance } from 'fastify';
import { notImplemented } from '../lib/stub';

export async function goalRoutes(app: FastifyInstance) {
  app.get('/goals', async (_req, reply) => notImplemented(reply, 'Listar metas — Fase 3 (§6.8)'));
  app.post('/goals', async (_req, reply) => notImplemented(reply, 'Criar meta — Fase 3 (§6.8)'));
  app.patch('/goals/:id', async (_req, reply) => notImplemented(reply, 'Editar meta — Fase 3 (§6.8)'));
  app.post('/goals/:id/contributions', async (_req, reply) =>
    notImplemented(reply, '"Registrar valor guardado" — Fase 3 (§6.8)'),
  );
}
