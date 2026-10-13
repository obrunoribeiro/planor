// Central de alertas — CONTEXTO.md §6.9, §8. O texto de cada alerta sai de `describeAlert`
// (packages/shared), a partir do tipo e do payload gravados por quem detectou.
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { alerts } from '@planor/db';
import { describeAlert, KNOWN_ALERT_TYPES } from '@planor/shared';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { requireUserId } from '../lib/auth';
import { db } from '../lib/db';

/** A central mostra os mais recentes; o resto fica no banco. */
const LIST_LIMIT = 100;

export async function alertRoutes(app: FastifyInstance) {
  app.get('/alerts', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const rows = await db
      .select()
      .from(alerts)
      .where(and(eq(alerts.userId, userId), inArray(alerts.type, [...KNOWN_ALERT_TYPES])))
      .orderBy(desc(alerts.createdAt))
      .limit(LIST_LIMIT);
    const items = rows.map((row) => ({
      id: row.id,
      type: row.type,
      createdAt: row.createdAt.toISOString(),
      read: row.readAt !== null,
      ...describeAlert(row.type, (row.payload as Record<string, unknown>) ?? {}),
    }));
    return { unreadCount: items.filter((i) => !i.read).length, items };
  });

  // Sem `ids`: "Marcar todos como lidos".
  const readSchema = z.object({ ids: z.array(z.string().uuid()).max(LIST_LIMIT).optional() });
  app.post('/alerts/read', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const body = readSchema.safeParse(request.body ?? {});
    if (!body.success) return reply.code(400).send({ error: 'invalid_request' });

    const conditions = [eq(alerts.userId, userId), isNull(alerts.readAt)];
    if (body.data.ids) conditions.push(inArray(alerts.id, body.data.ids));
    await db
      .update(alerts)
      .set({ readAt: new Date() })
      .where(and(...conditions));
    return reply.code(204).send();
  });
}
