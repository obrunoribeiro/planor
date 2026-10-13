// Metas pessoais e limites de categoria — CONTEXTO.md §6.8, §6.5 e §8. O Planor não move
// dinheiro: "Registrar valor guardado" só anota o que o usuário guardou no banco dele.
// Metas em grupo e da casa (§6.11/§6.12) ficam pra Fase 5.
import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import {
  categories,
  connections,
  goalContributions,
  goals,
  institutions,
  monthlySummaries,
} from '@planor/db';
import {
  addMonthsToKey,
  categoryLimitStatus,
  goalCaption,
  monthKeySaoPaulo,
  paceCents,
  suggestedPaceText,
  weeksUntil,
} from '@planor/shared';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { requireUserId } from '../lib/auth';
import { db } from '../lib/db';
import { todayKeySaoPaulo } from '../services/cardBills';
import { enqueueProcessTransactions } from '../jobs/queue';

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

type GoalRow = typeof goals.$inferSelect;

/** Valores do mês por categoria (`monthly_summaries.by_category`, gasto positivo). */
async function spentByCategory(userId: string, month: string): Promise<Record<string, number>> {
  const [summary] = await db
    .select({ byCategory: monthlySummaries.byCategory })
    .from(monthlySummaries)
    .where(and(eq(monthlySummaries.userId, userId), eq(monthlySummaries.month, month)));
  return (summary?.byCategory as Record<string, number> | undefined) ?? {};
}

async function savedByGoal(goalIds: string[]): Promise<Map<string, number>> {
  if (goalIds.length === 0) return new Map();
  const rows = await db
    .select({
      goalId: goalContributions.goalId,
      total: sql<number>`coalesce(sum(${goalContributions.amountCents}), 0)::int`,
    })
    .from(goalContributions)
    .where(inArray(goalContributions.goalId, goalIds))
    .groupBy(goalContributions.goalId);
  return new Map(rows.map((r) => [r.goalId, r.total]));
}

function view(
  goal: GoalRow,
  ctx: {
    saved: number;
    spent: Record<string, number>;
    categoryName: string | null;
    todayKey: string;
  },
) {
  const month = ctx.todayKey.slice(0, 7);
  const createdKey = todayKeySaoPaulo(goal.createdAt);
  if (goal.type === 'category_limit') {
    const spentCents = goal.categoryId ? (ctx.spent[goal.categoryId] ?? 0) : 0;
    const limit = {
      type: 'category_limit' as const,
      targetCents: goal.targetCents,
      spentCents,
      alertAtPct: goal.alertAtPct,
      startsMonth: goal.startsMonth,
    };
    const status = categoryLimitStatus({ ...limit, monthKey: month });
    return {
      id: goal.id,
      type: goal.type,
      name: goal.name,
      icon: goal.icon,
      targetCents: goal.targetCents,
      // Antes de começar, o limite mostra zero (Figma: "R$ 0,00 de R$ 300,00 por mês").
      currentCents: status === 'not_started' ? 0 : spentCents,
      categoryId: goal.categoryId,
      categoryName: ctx.categoryName,
      deadline: null,
      startsMonth: goal.startsMonth,
      alertAtPct: goal.alertAtPct,
      status,
      caption: goalCaption(limit, ctx.todayKey),
      suggestedPace: null,
      suggestedContributionCents: null,
      percent: goal.targetCents > 0 ? Math.round((spentCents / goal.targetCents) * 100) : 0,
    };
  }
  const deadline = goal.deadline ? String(goal.deadline).slice(0, 10) : null;
  const savings = {
    type: 'savings' as const,
    targetCents: goal.targetCents,
    savedCents: ctx.saved,
    deadline,
    createdKey,
  };
  return {
    id: goal.id,
    type: goal.type,
    name: goal.name,
    icon: goal.icon,
    targetCents: goal.targetCents,
    currentCents: ctx.saved,
    categoryId: null,
    categoryName: null,
    deadline,
    startsMonth: null,
    alertAtPct: null,
    status: ctx.saved >= goal.targetCents ? 'done' : 'ok',
    caption: goalCaption(savings, ctx.todayKey),
    suggestedPace: suggestedPaceText(savings, ctx.todayKey),
    // Valor sugerido no "Registrar valor guardado": o ritmo por semana até o prazo.
    suggestedContributionCents: deadline
      ? paceCents({ ...savings, periods: weeksUntil(ctx.todayKey, deadline) })
      : null,
    percent:
      goal.targetCents > 0 ? Math.min(100, Math.round((ctx.saved / goal.targetCents) * 100)) : 0,
  };
}

async function loadViews(userId: string, rows: GoalRow[]) {
  const todayKey = todayKeySaoPaulo();
  const [saved, spent, categoryRows] = await Promise.all([
    savedByGoal(rows.filter((g) => g.type === 'savings').map((g) => g.id)),
    spentByCategory(userId, todayKey.slice(0, 7)),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(or(isNull(categories.userId), eq(categories.userId, userId))),
  ]);
  const categoryName = new Map(categoryRows.map((c) => [c.id, c.name]));
  return rows.map((g) =>
    view(g, {
      saved: saved.get(g.id) ?? 0,
      spent,
      categoryName: g.categoryId ? (categoryName.get(g.categoryId) ?? null) : null,
      todayKey,
    }),
  );
}

const createSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('savings'),
    name: z.string().trim().min(1).max(60),
    targetCents: z.number().int().positive(),
    deadline: dateKey.nullable().optional(),
    icon: z.string().max(30).optional(),
  }),
  z.object({
    type: z.literal('category_limit'),
    categoryId: z.string().uuid(),
    targetCents: z.number().int().positive(),
    alertAt80: z.boolean().default(true),
    startNextMonth: z.boolean().default(false),
  }),
]);

const patchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  targetCents: z.number().int().positive().optional(),
  deadline: dateKey.nullable().optional(),
  alertAt80: z.boolean().optional(),
});

export async function goalRoutes(app: FastifyInstance) {
  app.get('/goals', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    // Só as pessoais por enquanto: casa e grupo são Fase 5.
    const rows = await db
      .select()
      .from(goals)
      .where(and(eq(goals.ownerId, userId), isNull(goals.householdId)))
      .orderBy(asc(goals.createdAt));
    return { items: await loadViews(userId, rows) };
  });

  app.get('/goals/:id', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const { id } = request.params as { id: string };
    if (!z.string().uuid().safeParse(id).success)
      return reply.code(400).send({ error: 'invalid_id' });
    const [goal] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.ownerId, userId)));
    if (!goal) return reply.code(404).send({ error: 'goal_not_found' });

    const [item] = await loadViews(userId, [goal]);
    const contributions = await db
      .select({
        id: goalContributions.id,
        amountCents: goalContributions.amountCents,
        where: goalContributions.where,
        createdAt: goalContributions.createdAt,
      })
      .from(goalContributions)
      .where(eq(goalContributions.goalId, id))
      .orderBy(desc(goalContributions.createdAt));
    // "Onde você guardou?": Caixinha/Poupança de cada banco conectado + Outro (Figma 51:1295).
    const banks = await db
      .selectDistinct({ name: institutions.name })
      .from(connections)
      .innerJoin(institutions, eq(institutions.id, connections.institutionId))
      .where(and(eq(connections.userId, userId), sql`${connections.status} <> 'disconnected'`));
    return {
      ...item,
      contributions: contributions.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
      whereOptions: [
        ...banks.flatMap((b) => [`Caixinha ${b.name}`, `Poupança ${b.name}`]),
        'Outro',
      ],
    };
  });

  app.post('/goals', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const body = createSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_request' });

    if (body.data.type === 'savings') {
      const [created] = await db
        .insert(goals)
        .values({
          ownerId: userId,
          type: 'savings',
          name: body.data.name,
          targetCents: body.data.targetCents,
          deadline: body.data.deadline ?? null,
          icon: body.data.icon ?? null,
        })
        .returning({ id: goals.id });
      return reply.code(201).send({ id: created!.id });
    }

    const { categoryId, targetCents, alertAt80, startNextMonth } = body.data;
    const [category] = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(
        and(
          eq(categories.id, categoryId),
          or(isNull(categories.userId), eq(categories.userId, userId)),
        ),
      );
    if (!category) return reply.code(400).send({ error: 'invalid_category' });
    // Um limite por categoria: criar de novo atualiza o que existe.
    const [existing] = await db
      .select({ id: goals.id })
      .from(goals)
      .where(
        and(
          eq(goals.ownerId, userId),
          eq(goals.type, 'category_limit'),
          eq(goals.categoryId, categoryId),
        ),
      );
    const values = {
      targetCents,
      alertAtPct: alertAt80 ? 0.8 : null,
      startsMonth: startNextMonth
        ? addMonthsToKey(monthKeySaoPaulo(new Date()), 1)
        : monthKeySaoPaulo(new Date()),
    };
    if (existing) {
      await db.update(goals).set(values).where(eq(goals.id, existing.id));
      await enqueueProcessTransactions(userId);
      return { id: existing.id };
    }
    const [created] = await db
      .insert(goals)
      .values({
        ownerId: userId,
        type: 'category_limit',
        name: `Limite de ${category.name.toLowerCase()}`,
        categoryId,
        ...values,
      })
      .returning({ id: goals.id });
    // Os alertas de limite saem no fim do processamento.
    await enqueueProcessTransactions(userId);
    return reply.code(201).send({ id: created!.id });
  });

  app.patch('/goals/:id', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const { id } = request.params as { id: string };
    const body = patchSchema.safeParse(request.body);
    if (!body.success || Object.keys(body.data).length === 0)
      return reply.code(400).send({ error: 'invalid_request' });
    const { alertAt80, ...rest } = body.data;
    const [updated] = await db
      .update(goals)
      .set({ ...rest, ...(alertAt80 !== undefined ? { alertAtPct: alertAt80 ? 0.8 : null } : {}) })
      .where(and(eq(goals.id, id), eq(goals.ownerId, userId)))
      .returning({ id: goals.id });
    if (!updated) return reply.code(404).send({ error: 'goal_not_found' });
    return { id: updated.id };
  });

  app.delete('/goals/:id', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const { id } = request.params as { id: string };
    const [deleted] = await db
      .delete(goals)
      .where(and(eq(goals.id, id), eq(goals.ownerId, userId)))
      .returning({ id: goals.id });
    if (!deleted) return reply.code(404).send({ error: 'goal_not_found' });
    return reply.code(204).send();
  });

  const contributionSchema = z.object({
    amountCents: z.number().int().positive(),
    where: z.string().trim().max(60).nullable().optional(),
  });
  app.post('/goals/:id/contributions', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const { id } = request.params as { id: string };
    const body = contributionSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_request' });
    const [goal] = await db
      .select({ type: goals.type })
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.ownerId, userId)));
    if (!goal) return reply.code(404).send({ error: 'goal_not_found' });
    if (goal.type !== 'savings') return reply.code(400).send({ error: 'not_a_savings_goal' });
    const [created] = await db
      .insert(goalContributions)
      .values({
        goalId: id,
        userId,
        amountCents: body.data.amountCents,
        where: body.data.where ?? null,
      })
      .returning({ id: goalContributions.id });
    return reply.code(201).send({ id: created!.id });
  });
}
