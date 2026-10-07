// GET /home — CONTEXTO.md §6.4 e §8 ("sobra, composição, comprometido, plano da semana, cards").
//
// `dueUntilMonthEndCents` (parcelas + assinaturas + fixos que ainda vencem este mês) fica como
// TODO: precisa de uma consulta sobre `installment_plans`/`recurrences`/`manual_recurring_bills`
// filtrando por data de vencimento, que é trabalho da Fase 3 ("Comprometido, sobra e faturas",
// CONTEXTO.md §13) — não entra aqui pra não misturar escopos.
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import {
  alerts,
  committedByMonth,
  installmentPlans,
  monthlySummaries,
  recurrences,
  transactions,
  users,
  weeklyPlans,
} from '@planor/db';
import { monthAbbrevPtBR, projectedLeftover } from '@planor/shared';
import type { FastifyInstance } from 'fastify';
import { requireUserId } from '../lib/auth';
import { db } from '../lib/db';

function currentMonthSaoPaulo(): string {
  // "Mês" calcula em America/Sao_Paulo (CLAUDE.md, princípio 5), não em UTC.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  return `${year}-${month}`;
}

type WeeklyPlanItem = {
  type: string;
  title: string;
  description: string;
  actionRoute: string;
  completed: boolean;
  completedAutomatically: boolean;
};

/** Gasto acumulado por dia do mês (saídas, sem ocultas nem transferências) — vira a Sparkline do
 * card "Gasto do mês". Dado real, calculado na hora a partir das transações (não existe mês
 * anterior semeado pra comparar tendência, então isso é só o acumulado deste mês mesmo). */
async function dailySpendCumulative(userId: string, month: string): Promise<number[]> {
  const rows = await db
    .select({ postedAt: transactions.postedAt, amountCents: transactions.amountCents })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.isHidden, false),
        eq(transactions.isTransfer, false),
        sql`${transactions.amountCents} < 0`,
        sql`to_char(${transactions.postedAt} at time zone 'America/Sao_Paulo', 'YYYY-MM') = ${month}`,
      ),
    );

  if (rows.length === 0) return [];

  const byDay = new Map<number, number>();
  let lastDay = 1;
  for (const row of rows) {
    const day = Number(
      new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', day: '2-digit' }).format(row.postedAt),
    );
    byDay.set(day, (byDay.get(day) ?? 0) + Math.abs(row.amountCents));
    if (day > lastDay) lastDay = day;
  }

  const cumulative: number[] = [];
  let running = 0;
  for (let day = 1; day <= lastDay; day += 1) {
    running += byDay.get(day) ?? 0;
    cumulative.push(running);
  }
  return cumulative;
}

export async function homeRoutes(app: FastifyInstance) {
  app.get('/home', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return; // requireUserId já respondeu (401/500)

    const month = (request.query as { month?: string }).month ?? currentMonthSaoPaulo();

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return reply.code(404).send({ error: 'user_not_found' });

    const [summary] = await db
      .select()
      .from(monthlySummaries)
      .where(and(eq(monthlySummaries.userId, userId), eq(monthlySummaries.month, month)));

    const monthlyIncomeCents = user.monthlyIncomeCents ?? 0;
    const spentThisMonthCents = summary?.spentCents ?? 0;
    // TODO (Fase 3): somar parcelas + assinaturas + fixos que ainda vencem até o fim do mês.
    const dueUntilMonthEndCents = 0;

    const [alertsCount] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(alerts)
      .where(and(eq(alerts.userId, userId), isNull(alerts.readAt)));

    const committedRows = await db
      .select()
      .from(committedByMonth)
      .where(eq(committedByMonth.userId, userId))
      .orderBy(committedByMonth.month)
      .limit(4);
    const committedMonths = committedRows.map((row) => ({
      label: monthAbbrevPtBR(row.month),
      amountCents: row.installmentsCents + row.subscriptionsCents + row.billsCents,
    }));
    const nextMonth = committedRows[0];

    const [latestWeeklyPlan] = await db
      .select()
      .from(weeklyPlans)
      .where(eq(weeklyPlans.userId, userId))
      .orderBy(desc(weeklyPlans.weekStart))
      .limit(1);
    const weeklyItems = (latestWeeklyPlan?.items as WeeklyPlanItem[] | undefined) ?? [];

    const activeSubscriptions = await db
      .select()
      .from(recurrences)
      .where(and(eq(recurrences.userId, userId), eq(recurrences.kind, 'subscription'), eq(recurrences.status, 'active')));
    const subscriptionsMonthlyCents = activeSubscriptions.reduce((sum, s) => sum + s.amountCents, 0);
    const unusedSubscriptions = activeSubscriptions.filter((s) => s.usage === 'none').length;

    const plans = await db.select().from(installmentPlans).where(eq(installmentPlans.userId, userId));
    const installmentsMonthlyCents = plans.reduce((sum, p) => sum + p.installmentCents, 0);
    const lastInstallmentDate = plans.reduce<string | null>(
      (latest, p) => (!latest || p.lastDate > latest ? p.lastDate : latest),
      null,
    );

    const sparkline = await dailySpendCumulative(userId, month);

    return {
      month,
      user: { name: user.name, plan: user.plan },
      unreadAlerts: alertsCount?.value ?? 0,
      leftover: {
        monthlyIncomeCents,
        spentThisMonthCents,
        dueUntilMonthEndCents,
        projectedLeftoverCents: projectedLeftover({
          monthlyIncomeCents,
          spentThisMonthCents,
          dueUntilMonthEndCents,
        }),
      },
      committed: nextMonth
        ? {
            nextMonthLabel: monthAbbrevPtBR(nextMonth.month),
            nextMonthAmountCents: nextMonth.installmentsCents + nextMonth.subscriptionsCents + nextMonth.billsCents,
            months: committedMonths,
          }
        : null,
      weeklyPlan: {
        doneCount: weeklyItems.filter((item) => item.completed).length,
        totalCount: weeklyItems.length,
        items: weeklyItems,
      },
      spendingThisMonth: {
        amountCents: spentThisMonthCents,
        trendVsLastMonthPct: null,
        sparkline,
      },
      subscriptions: {
        count: activeSubscriptions.length,
        monthlyCents: subscriptionsMonthlyCents,
        yearlyCents: subscriptionsMonthlyCents * 12,
        unusedCount: unusedSubscriptions,
        // Só as 2 primeiras viram avatar (pilha de círculos no card) — o resto some no "+N".
        avatars: activeSubscriptions.slice(0, 2).map((s, i) => ({
          initials: s.merchantName.charAt(0).toUpperCase(),
          colorToken: i % 2 === 0 ? ('purple800' as const) : ('alert800' as const),
        })),
      },
      installments: {
        count: plans.length,
        monthlyCents: installmentsMonthlyCents,
        lastInstallmentDate,
        progress: plans.slice(0, 3).map((p) => ({ label: `${p.current}/${p.count}`, percent: (p.current / p.count) * 100 })),
      },
      fixedVsVariable: {
        fixedCents: summary?.fixedCents ?? 0,
        variableCents: summary?.variableCents ?? 0,
        fixedPct: summary && summary.fixedCents + summary.variableCents > 0
          ? Math.round((summary.fixedCents / (summary.fixedCents + summary.variableCents)) * 100)
          : 0,
      },
      // `monthly_recaps` ainda não é gerado (job da Fase 5, CONTEXTO.md §6.13) — o card de
      // retrospectiva na Home só aparece quando isso vier preenchido de verdade.
      retrospective: null,
    };
  });
}
