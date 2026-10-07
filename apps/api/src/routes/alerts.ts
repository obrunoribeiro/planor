// Central de alertas — CONTEXTO.md §6.9, §8.
import type { FastifyInstance } from 'fastify';
import { notImplemented } from '../lib/stub';

export async function alertRoutes(app: FastifyInstance) {
  app.get('/alerts', async (_req, reply) => notImplemented(reply, 'Lista de alertas — Fase 3 (§6.9)'));
  app.post('/alerts/read', async (_req, reply) =>
    notImplemented(reply, 'Marcar como lido — Fase 3 (§6.9)'),
  );
}
