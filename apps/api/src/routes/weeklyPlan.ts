// Plano da semana — CONTEXTO.md §6.4. `GET /weekly-plan` (tela do plano) e
// `PATCH /weekly-plan/items/:index` (caixa de seleção). O §8 não listava uma rota pra marcar item;
// sem ela, a marcação feita à mão se perdia ao recarregar.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUserId } from '../lib/auth';
import { currentWeeklyPlan, setWeeklyPlanItemCompleted } from '../services/weeklyPlan';

const toggleBody = z.object({ completed: z.boolean() });

export async function weeklyPlanRoutes(app: FastifyInstance) {
  app.get('/weekly-plan', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    return currentWeeklyPlan(userId);
  });

  app.patch('/weekly-plan/items/:index', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const index = Number((request.params as { index: string }).index);
    const body = toggleBody.safeParse(request.body);
    if (!Number.isInteger(index) || index < 0 || !body.success) return reply.code(400).send({ error: 'invalid_request' });

    const plan = await setWeeklyPlanItemCompleted(userId, index, body.data.completed);
    if (!plan) return reply.code(404).send({ error: 'item_not_found' });
    return plan;
  });
}
