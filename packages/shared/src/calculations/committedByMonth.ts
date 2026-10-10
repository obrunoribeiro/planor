// Já comprometido por mês — CONTEXTO.md §2 (`committed`) e §6.3, passo 9.
//
//   comprometido(mês) = parcelas que caem no mês + assinaturas + fixos recorrentes cobrados no mês
//
// Começa no mês seguinte ao de referência (o mês corrente é "a vencer", outro número) e vai até
// `horizon` meses (o Futuro mostra 6).

import type { AmountCents } from '../money';
import { addMonthsToKey, monthsBetweenKeys } from '../pipeline/installments';
import { monthKeySaoPaulo } from '../pipeline/monthlySummary';

export type CommittedInstallment = {
  installmentCents: AmountCents;
  /** Valor real das parcelas que já existem como transação, por mês. */
  amountByMonth?: Record<string, AmountCents>;
  firstMonth: string;
  lastMonth: string;
};

export type CommittedRecurrence = {
  kind: 'subscription' | 'recurring_bill';
  amountCents: AmountCents;
  cadenceDays: number;
  /** Próxima cobrança conhecida. Sem ela, só dá pra projetar recorrência mensal (todo mês). */
  nextChargeAt: Date | null;
};

export type CommittedMonth = {
  month: string;
  installmentsCents: AmountCents;
  subscriptionsCents: AmountCents;
  billsCents: AmountCents;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHLY_MAX_DAYS = 35; // mesma janela de 28 a 35 dias do §6.3, passo 5

/** Meses (dentro de `months`) em que a recorrência cobra. */
function chargeMonths(recurrence: CommittedRecurrence, months: string[]): string[] {
  if (!recurrence.nextChargeAt) return recurrence.cadenceDays <= MONTHLY_MAX_DAYS ? months : [];

  const last = months[months.length - 1]!;
  const hits = new Set<string>();
  for (let at = recurrence.nextChargeAt.getTime(); ; at += recurrence.cadenceDays * DAY_MS) {
    const month = monthKeySaoPaulo(new Date(at));
    if (month > last) break;
    hits.add(month);
  }
  return months.filter((m) => hits.has(m));
}

export function projectCommittedByMonth(input: {
  referenceMonth: string;
  horizon: number;
  installments: CommittedInstallment[];
  recurrences: CommittedRecurrence[];
}): CommittedMonth[] {
  const months = Array.from({ length: input.horizon }, (_, i) => addMonthsToKey(input.referenceMonth, i + 1));
  const byMonth = new Map(months.map((month) => [month, { month, installmentsCents: 0, subscriptionsCents: 0, billsCents: 0 }]));

  for (const plan of input.installments) {
    for (const month of months) {
      if (monthsBetweenKeys(plan.firstMonth, month) >= 0 && monthsBetweenKeys(month, plan.lastMonth) >= 0) {
        byMonth.get(month)!.installmentsCents += plan.amountByMonth?.[month] ?? plan.installmentCents;
      }
    }
  }

  for (const recurrence of input.recurrences) {
    for (const month of chargeMonths(recurrence, months)) {
      const row = byMonth.get(month)!;
      if (recurrence.kind === 'subscription') row.subscriptionsCents += recurrence.amountCents;
      else row.billsCents += recurrence.amountCents;
    }
  }

  // Corta os meses do fim que não têm nada comprometido (ex.: última parcela em dezembro).
  const result = months.map((m) => byMonth.get(m)!);
  while (result.length > 0) {
    const tail = result[result.length - 1]!;
    if (tail.installmentsCents + tail.subscriptionsCents + tail.billsCents > 0) break;
    result.pop();
  }
  return result;
}
