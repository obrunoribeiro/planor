// GET/PATCH /settings — CONTEXTO.md §6.10, grupo "Segurança". Por ora só lê/grava
// `hideValuesOnOpen`; os outros campos da tabela `settings` (biometria, bloqueio, privacidade)
// ainda não têm tela própria — ver PROGRESSO.md.
import { eq } from 'drizzle-orm';
import { settings } from '@planor/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUserId } from '../lib/auth';
import { db } from '../lib/db';

const patchSettingsSchema = z.object({
  hideValuesOnOpen: z.boolean().optional(),
});

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/settings', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const [created] = await db.insert(settings).values({ userId }).onConflictDoNothing({ target: settings.userId }).returning();
    if (created) return created;

    const [existing] = await db.select().from(settings).where(eq(settings.userId, userId));
    return existing;
  });

  app.patch('/settings', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const parsed = patchSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.issues });
    }
    if (Object.keys(parsed.data).length === 0) {
      return reply.code(400).send({ error: 'empty_body' });
    }

    const [updated] = await db
      .insert(settings)
      .values({ userId, ...parsed.data })
      .onConflictDoUpdate({ target: settings.userId, set: parsed.data })
      .returning();

    return updated;
  });
}
