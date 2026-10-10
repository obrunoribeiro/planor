// GET /forecast/leftover — "Como calculamos a sobra" (CONTEXTO.md §6.4, §8). Mesma conta da Home,
// aberta em parcelas: renda − já gasto − a vencer, e o que ainda vence no mês por tipo.
import { and, eq } from 'drizzle-orm';
import { monthlySummaries, users } from '@planor/db';
import { monthKeySaoPaulo, monthRangeSaoPaulo, projectedLeftover } from '@planor/shared';
import type { FastifyInstance } from 'fastify';
import { requireUserId } from '../lib/auth';
import { db } from '../lib/db';
import { dueThisMonth } from '../services/dueThisMonth';
import { undetailedSpendingCents } from '../services/undetailedSpending';

export async function forecastRoutes(app: FastifyInstance) {
  app.get('/forecast/leftover', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const now = new Date();
    const month = monthKeySaoPaulo(now);
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return reply.code(404).send({ error: 'user_not_found' });

    const [[summary], undetailedCents, due] = await Promise.all([
      db
        .select({ spentCents: monthlySummaries.spentCents })
        .from(monthlySummaries)
        .where(and(eq(monthlySummaries.userId, userId), eq(monthlySummaries.month, month))),
      undetailedSpendingCents(userId),
      dueThisMonth(userId),
    ]);

    const monthlyIncomeCents = user.monthlyIncomeCents ?? 0;
    const spentThisMonthCents = (summary?.spentCents ?? 0) + undetailedCents;
    // Último dia do mês em São Paulo: o fim do intervalo é meia-noite do dia 1º seguinte.
    const lastDay = new Date(monthRangeSaoPaulo(month).end.getTime() - 1);

    return {
      month,
      monthEndDateKey: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(lastDay),
      monthlyIncomeCents,
      spentThisMonthCents,
      undetailedCents,
      due: {
        installmentsCents: due.installmentsCents,
        subscriptionsCents: due.subscriptionsCents,
        billsCents: due.billsCents,
        otherCents: due.otherCents,
        totalCents: due.totalCents,
      },
      projectedLeftoverCents: projectedLeftover({
        monthlyIncomeCents,
        spentThisMonthCents,
        dueUntilMonthEndCents: due.totalCents,
      }),
    };
  });
}
