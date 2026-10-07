// Planor IA (chat com function calling) — CONTEXTO.md §6.7, §8.
// A IA nunca faz conta: as ferramentas chamam SQL determinístico (CLAUDE.md, princípio 2).
import type { FastifyInstance } from 'fastify';
import { notImplemented } from '../lib/stub';

export async function aiRoutes(app: FastifyInstance) {
  app.post('/ai/chat', async (_req, reply) =>
    notImplemented(reply, 'Chat com streaming (SSE) e ferramentas — Fase 3 (§6.7)'),
  );
  app.get('/ai/conversations', async (_req, reply) =>
    notImplemented(reply, 'Histórico de conversas — Fase 3 (§6.7)'),
  );
}
