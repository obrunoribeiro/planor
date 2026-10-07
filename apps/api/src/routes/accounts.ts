// GET /accounts — lista simples das contas do usuário (CONTEXTO.md §6.5, filtro "contas" de
// Transações). Independente do ciclo de vida de conexão do agregador (`connections.ts`, ainda
// stub) — as contas já existem no banco (hoje via seed; mais tarde via Pluggy) e isso só lê.
import { eq } from 'drizzle-orm';
import { accounts } from '@planor/db';
import type { FastifyInstance } from 'fastify';
import { requireUserId } from '../lib/auth';
import { db } from '../lib/db';

export async function accountRoutes(app: FastifyInstance) {
  app.get('/accounts', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const rows = await db.select({ id: accounts.id, name: accounts.name, type: accounts.type }).from(accounts).where(eq(accounts.userId, userId));
    return rows;
  });
}
