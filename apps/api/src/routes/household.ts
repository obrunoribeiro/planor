// Casa compartilhada (família e casal) — CONTEXTO.md §6.11, §8.
import type { FastifyInstance } from 'fastify';
import { notImplemented } from '../lib/stub';

export async function householdRoutes(app: FastifyInstance) {
  app.get('/households', async (_req, reply) => notImplemented(reply, 'Listar casas — Fase 5 (§6.11)'));
  app.post('/households', async (_req, reply) => notImplemented(reply, 'Criar casa — Fase 5 (§6.11)'));
  app.post('/households/:id/invites', async (_req, reply) =>
    notImplemented(reply, 'Convidar (celular/e-mail/link, 7 dias) — Fase 5 (§6.11)'),
  );
  app.get('/households/:id/dashboard', async (_req, reply) =>
    notImplemented(reply, 'Painel — quem pagou quanto, acerto — Fase 5 (§6.11)'),
  );
  app.post('/households/:id/settlements', async (_req, reply) =>
    notImplemented(reply, 'Registrar acerto — Fase 5 (§6.11, pacotes/shared já tem o cálculo)'),
  );
}
