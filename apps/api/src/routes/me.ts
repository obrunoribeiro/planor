// GET/PATCH /me — CONTEXTO.md §6.10: "Editar perfil: nome, renda mensal (usada na sobra) e dia
// em que recebe."
import { eq } from 'drizzle-orm';
import { users } from '@planor/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUserId } from '../lib/auth';
import { db } from '../lib/db';

const patchMeSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  monthlyIncomeCents: z.number().int().nonnegative().optional(),
  payday: z.number().int().min(1).max(31).optional(),
});

export async function meRoutes(app: FastifyInstance) {
  app.get('/me', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return reply.code(404).send({ error: 'user_not_found' });

    return user;
  });

  app.patch('/me', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const parsed = patchMeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.issues });
    }
    if (Object.keys(parsed.data).length === 0) {
      return reply.code(400).send({ error: 'empty_body' });
    }

    const [updated] = await db.update(users).set(parsed.data).where(eq(users.id, userId)).returning();
    return updated;
  });
}
