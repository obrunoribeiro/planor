// GET /categories — lista categorias globais + as criadas pelo usuário (CONTEXTO.md §6.3, §6.5).
// Usada pelos seletores de categoria (sheet "Mudar categoria", filtros de Transações).
import { isNull, or, eq } from 'drizzle-orm';
import { categories } from '@planor/db';
import type { FastifyInstance } from 'fastify';
import { requireUserId } from '../lib/auth';
import { db } from '../lib/db';

export async function categoryRoutes(app: FastifyInstance) {
  app.get('/categories', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const rows = await db
      .select()
      .from(categories)
      .where(or(isNull(categories.userId), eq(categories.userId, userId)));

    return rows
      .map((c) => ({ id: c.id, name: c.name, kind: c.defaultKind, includeInAnalysis: c.includeInAnalysis }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  });
}
