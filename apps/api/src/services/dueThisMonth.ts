// O que ainda cai entre agora e o fim do mês corrente — parcelas, assinaturas e fixos (§6.4).
// Usado pela Home (sobra prevista) e por "Como calculamos a sobra" (`GET /forecast/leftover`).
import { and, eq, gt, lt } from 'drizzle-orm';
import { recurrences, transactions } from '@planor/db';
import { dueUntilMonthEnd, monthKeySaoPaulo, monthRangeSaoPaulo, type DueUntilMonthEnd } from '@planor/shared';
import { db } from '../lib/db';

export async function dueThisMonth(userId: string): Promise<DueUntilMonthEnd> {
  const now = new Date();
  const monthEnd = monthRangeSaoPaulo(monthKeySaoPaulo(now)).end;
  const [upcoming, activeRecurrences] = await Promise.all([
    db
      .select({
        postedAt: transactions.postedAt,
        amountCents: transactions.amountCents,
        installmentCount: transactions.installmentCount,
        installmentPlanId: transactions.installmentPlanId,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.isHidden, false),
          eq(transactions.isTransfer, false),
          gt(transactions.postedAt, now),
          lt(transactions.postedAt, monthEnd),
        ),
      ),
    db
      .select({ kind: recurrences.kind, amountCents: recurrences.amountCents, nextChargeAt: recurrences.nextChargeAt })
      .from(recurrences)
      .where(and(eq(recurrences.userId, userId), eq(recurrences.status, 'active'))),
  ]);

  return dueUntilMonthEnd({
    now,
    transactions: upcoming.map((t) => ({
      postedAt: t.postedAt,
      amountCents: t.amountCents,
      isInstallment: t.installmentPlanId !== null || (t.installmentCount ?? 0) > 1,
    })),
    recurrences: activeRecurrences,
  });
}
