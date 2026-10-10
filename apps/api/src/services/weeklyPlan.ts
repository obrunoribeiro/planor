// Plano da semana (CONTEXTO.md §6.4) no banco: gera quando a semana ainda não tem plano (ou o plano
// é de um formato antigo, como o do seed), avalia ao vivo (progresso e conclusão automática) e
// grava o que mudou. As regras moram em `packages/shared/src/calculations/weeklyPlan.ts`.
import { and, eq, gte, inArray, isNull, lt, lte, ne, or } from 'drizzle-orm';
import { accounts, categories, connections, creditCards, institutions, monthlySummaries, transactions, users, weeklyPlans } from '@planor/db';
import {
  buildWeeklyPlan,
  evaluateWeeklyPlan,
  lastMonthKeys,
  monthlyAverageCents,
  monthRangeSaoPaulo,
  nextDueDateKey,
  previousMonthKey,
  weekEndKey,
  weekRangeLabel,
  weekStartKey,
  type WeeklyPlanInput,
  type WeeklyPlanItem,
} from '@planor/shared';
import { db } from '../lib/db';

function todayKeySaoPaulo(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
}

/** Meia-noite de `dateKey` em São Paulo (UTC−03:00, sem horário de verão desde 2019). */
function startOfDaySaoPaulo(dateKey: string): Date {
  return new Date(`${dateKey}T03:00:00Z`);
}

async function gatherInput(userId: string, todayKey: string, now: Date): Promise<WeeklyPlanInput> {
  const month = todayKey.slice(0, 7);
  const previousMonths = lastMonthKeys(previousMonthKey(month), 3);
  const { start: monthStart } = monthRangeSaoPaulo(month);

  const [[user], cards, summaries, categoryRows, uncategorized] = await Promise.all([
    db.select({ monthlyIncomeCents: users.monthlyIncomeCents }).from(users).where(eq(users.id, userId)),
    db
      .select({ bank: institutions.name, amountCents: creditCards.currentBillCents, dueDay: creditCards.dueDay })
      .from(creditCards)
      .innerJoin(accounts, eq(accounts.id, creditCards.accountId))
      .innerJoin(connections, eq(connections.id, accounts.connectionId))
      .innerJoin(institutions, eq(institutions.id, connections.institutionId))
      .where(and(eq(accounts.userId, userId), ne(connections.status, 'disconnected'))),
    db
      .select({ month: monthlySummaries.month, byCategory: monthlySummaries.byCategory })
      .from(monthlySummaries)
      .where(and(eq(monthlySummaries.userId, userId), inArray(monthlySummaries.month, [month, ...previousMonths]))),
    db
      .select({ id: categories.id, name: categories.name, kind: categories.defaultKind })
      .from(categories)
      .where(or(isNull(categories.userId), eq(categories.userId, userId))),
    db
      .select({ id: transactions.id, amountCents: transactions.amountCents })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          isNull(transactions.categoryId),
          eq(transactions.isHidden, false),
          eq(transactions.isTransfer, false),
          lt(transactions.amountCents, 0),
          gte(transactions.postedAt, monthStart),
          lte(transactions.postedAt, now),
        ),
      ),
  ]);

  const byMonth = new Map(summaries.map((s) => [s.month, (s.byCategory as Record<string, number>) ?? {}]));
  const current = byMonth.get(month) ?? {};

  return {
    todayKey,
    monthlyIncomeCents: user?.monthlyIncomeCents ?? null,
    cardBills: cards
      .filter((c) => c.amountCents !== null)
      .map((c) => ({ bank: c.bank, amountCents: c.amountCents!, dueDateKey: nextDueDateKey(c.dueDay, todayKey) })),
    categories: categoryRows.map((c) => ({
      categoryId: c.id,
      name: c.name,
      kind: c.kind,
      monthToDateCents: current[c.id] ?? 0,
      averageMonthlyCents: monthlyAverageCents(
        previousMonths.map((m) => ({ amountCents: byMonth.get(m)?.[c.id] ?? 0, hasData: byMonth.has(m) })),
      ),
    })),
    uncategorized: uncategorized.map((t) => ({ id: t.id, amountCents: -t.amountCents })),
  };
}

async function gatherLive(userId: string, items: WeeklyPlanItem[], todayKey: string, weekStart: string, now: Date) {
  const [[user], weekRows] = await Promise.all([
    db.select({ monthlyIncomeCents: users.monthlyIncomeCents }).from(users).where(eq(users.id, userId)),
    db
      .select({ categoryId: transactions.categoryId, amountCents: transactions.amountCents })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.isHidden, false),
          eq(transactions.isTransfer, false),
          lt(transactions.amountCents, 0),
          gte(transactions.postedAt, startOfDaySaoPaulo(weekStart)),
          lte(transactions.postedAt, now),
        ),
      ),
  ]);

  const weekSpentByCategory: Record<string, number> = {};
  for (const row of weekRows) {
    if (row.categoryId) weekSpentByCategory[row.categoryId] = (weekSpentByCategory[row.categoryId] ?? 0) - row.amountCents;
  }

  // Ocultar a compra também resolve o item ("não é gasto meu", não precisa de categoria).
  const ids = items.flatMap((i) => i.data.transactionIds ?? []);
  const stillUncategorized = ids.length
    ? await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(and(inArray(transactions.id, ids), isNull(transactions.categoryId), eq(transactions.isHidden, false)))
    : [];

  return {
    todayKey,
    incomeSet: (user?.monthlyIncomeCents ?? 0) > 0,
    weekSpentByCategory,
    stillUncategorizedIds: stillUncategorized.map((r) => r.id),
  };
}

export type CurrentWeeklyPlan = {
  weekStartKey: string;
  weekEndKey: string;
  label: string;
  items: WeeklyPlanItem[];
};

function isCurrentFormat(items: unknown): items is WeeklyPlanItem[] {
  return Array.isArray(items) && items.every((i) => (i as { version?: number }).version === 1);
}

/** Plano da semana corrente: cria se ainda não existe, avalia e grava o que mudou. */
export async function currentWeeklyPlan(userId: string, now = new Date()): Promise<CurrentWeeklyPlan> {
  const todayKey = todayKeySaoPaulo(now);
  const start = weekStartKey(todayKey);

  const [existing] = await db
    .select()
    .from(weeklyPlans)
    .where(and(eq(weeklyPlans.userId, userId), eq(weeklyPlans.weekStart, start)));

  let planId = existing?.id;
  let items: WeeklyPlanItem[];
  if (existing && isCurrentFormat(existing.items)) {
    items = existing.items;
  } else {
    items = buildWeeklyPlan(await gatherInput(userId, todayKey, now));
    if (existing) await db.update(weeklyPlans).set({ items }).where(eq(weeklyPlans.id, existing.id));
    else planId = (await db.insert(weeklyPlans).values({ userId, weekStart: start, items }).returning())[0]!.id;
  }

  const evaluated = evaluateWeeklyPlan(items, await gatherLive(userId, items, todayKey, start, now));
  if (JSON.stringify(evaluated) !== JSON.stringify(items)) {
    await db.update(weeklyPlans).set({ items: evaluated }).where(eq(weeklyPlans.id, planId!));
  }

  return { weekStartKey: start, weekEndKey: weekEndKey(start), label: weekRangeLabel(start), items: evaluated };
}

/** Marcar/desmarcar à mão (caixa de seleção no card e na tela do plano). */
export async function setWeeklyPlanItemCompleted(userId: string, index: number, completed: boolean): Promise<CurrentWeeklyPlan | null> {
  const plan = await currentWeeklyPlan(userId);
  const target = plan.items[index];
  if (!target) return null;

  const items = plan.items.map((item, i) =>
    i === index
      ? { ...item, completed, completedAt: completed ? todayKeySaoPaulo(new Date()) : null, completedAutomatically: false }
      : item,
  );
  await db
    .update(weeklyPlans)
    .set({ items })
    .where(and(eq(weeklyPlans.userId, userId), eq(weeklyPlans.weekStart, plan.weekStartKey)));
  return { ...plan, items };
}

/** Job `weekly-plan` (segunda, 6h): garante o plano da semana de todo usuário com banco conectado. */
export async function generateWeeklyPlans(): Promise<{ users: number }> {
  const rows = await db
    .selectDistinct({ userId: connections.userId })
    .from(connections)
    .where(ne(connections.status, 'disconnected'));
  for (const row of rows) await currentWeeklyPlan(row.userId);
  return { users: rows.length };
}
