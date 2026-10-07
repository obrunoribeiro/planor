// Amigos, feed, desafios e despesas divididas — CONTEXTO.md §6.12, §8.
// Regra de privacidade fixa: amigos nunca veem saldo, renda, gastos nem transações.
import type { FastifyInstance } from 'fastify';
import { notImplemented } from '../lib/stub';

export async function socialRoutes(app: FastifyInstance) {
  app.get('/friends', async (_req, reply) => notImplemented(reply, 'Lista de amigos — Fase 5 (§6.12)'));
  app.post('/friends', async (_req, reply) =>
    notImplemented(reply, 'Adicionar por @usuário/QR/link — Fase 5 (§6.12)'),
  );
  app.get('/feed', async (_req, reply) => notImplemented(reply, 'Feed — Fase 5 (§6.12)'));
  app.post('/posts/:id/reactions', async (_req, reply) => notImplemented(reply, 'Aplaudir — Fase 5 (§6.12)'));
  app.post('/posts/:id/comments', async (_req, reply) => notImplemented(reply, 'Comentar — Fase 5 (§6.12)'));
  app.get('/challenges', async (_req, reply) => notImplemented(reply, 'Desafios — Fase 5 (§6.12)'));
  app.post('/challenges', async (_req, reply) => notImplemented(reply, 'Criar desafio — Fase 5 (§6.12)'));
  app.post('/split-expenses', async (_req, reply) =>
    notImplemented(reply, 'Dividir despesa — Fase 5 (§6.12)'),
  );
}
