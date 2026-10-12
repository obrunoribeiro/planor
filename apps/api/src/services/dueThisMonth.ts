// O que ainda cai entre agora e o fim do mês corrente — parcelas, assinaturas e fixos (§6.4).
// Usado pela Home (sobra prevista) e por "Como calculamos a sobra" (`GET /forecast/leftover`).
import { and, eq, gt, lt } from 'drizzle-orm';
import { manualRecurringBills, recurrences, transactions } from '@planor/db';
import { dueUntilMonthEnd, manualBillAsRecurrence, monthKeySaoPaulo, monthRangeSaoPaulo, type DueUntilMonthEnd } from '@planor/shared';
import { db } from '../lib/db';

export async function dueThisMonth(userId: string): Promise<DueUntilMonthEnd> {
  const now = new Date();
  const monthEnd = monthRangeSaoPaulo(monthKeySaoPaulo(now)).end;
  const [upcoming, activeRecurrences, manualBills] = await Promise.all([
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
    db.select({ amountCents: manualRecurringBills.amountCents, day: manualRecurringBills.day }).from(manualRecurringBills).where(eq(manualRecurringBills.userId, userId)),
  ]);
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);

  return dueUntilMonthEnd({
    now,
    transactions: upcoming.map((t) => ({
      postedAt: t.postedAt,
      amountCents: t.amountCents,
      isInstallment: t.installmentPlanId !== null || (t.installmentCount ?? 0) > 1,
    })),
    // "Nova conta fixa" cadastrada à mão entra igual a um fixo recorrente detectado.
    recurrences: [...activeRecurrences, ...manualBills.map((bill) => manualBillAsRecurrence(bill, todayKey))],
  });
}
