// A vencer até o fim do mês — CONTEXTO.md §2 (`dueUntilMonthEnd`) e §6.4.
//
//   dueUntilMonthEnd = parcelas + assinaturas + fixos que ainda vencem até o último dia do mês
//
// Duas fontes:
//   - transações com data entre agora e o fim do mês (America/Sao_Paulo). O agregador já devolve
//     as próximas parcelas do cartão como transações com data futura; quando a data chega, elas
//     passam a contar em "gasto do mês" e saem daqui sozinhas;
//   - recorrências ativas com próxima cobrança até o fim do mês. Uma cobrança atrasada até 5 dias
//     ainda conta (o banco às vezes lança um ou dois dias depois); mais que isso, provavelmente
//     foi cancelada, e não entra — o app não inventa gasto (§1, "Honestidade nas telas").

import type { AmountCents } from '../money';
import { monthKeySaoPaulo } from '../pipeline/monthlySummary';
import { monthRangeSaoPaulo } from '../dates';

const LATE_CHARGE_GRACE_DAYS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export type UpcomingTransaction = {
  postedAt: Date;
  /** Negativo = gasto. */
  amountCents: AmountCents;
  isInstallment: boolean;
};

export type UpcomingRecurrence = {
  kind: 'subscription' | 'recurring_bill';
  amountCents: AmountCents;
  nextChargeAt: Date | null;
};

export type DueUntilMonthEnd = {
  installmentsCents: AmountCents;
  subscriptionsCents: AmountCents;
  billsCents: AmountCents;
  /** Outras saídas já agendadas pro resto do mês (raro: transação futura que não é parcela). */
  otherCents: AmountCents;
  totalCents: AmountCents;
};

export function dueUntilMonthEnd(input: {
  now: Date;
  transactions: UpcomingTransaction[];
  recurrences: UpcomingRecurrence[];
}): DueUntilMonthEnd {
  const now = input.now.getTime();
  const monthEnd = monthRangeSaoPaulo(monthKeySaoPaulo(input.now)).end.getTime();
  const result = { installmentsCents: 0, subscriptionsCents: 0, billsCents: 0, otherCents: 0, totalCents: 0 };

  for (const tx of input.transactions) {
    const at = tx.postedAt.getTime();
    if (tx.amountCents >= 0 || at <= now || at >= monthEnd) continue;
    if (tx.isInstallment) result.installmentsCents += -tx.amountCents;
    else result.otherCents += -tx.amountCents;
  }

  for (const recurrence of input.recurrences) {
    if (!recurrence.nextChargeAt) continue;
    const at = recurrence.nextChargeAt.getTime();
    if (at < now - LATE_CHARGE_GRACE_DAYS * DAY_MS || at >= monthEnd) continue;
    if (recurrence.kind === 'subscription') result.subscriptionsCents += recurrence.amountCents;
    else result.billsCents += recurrence.amountCents;
  }

  result.totalCents = result.installmentsCents + result.subscriptionsCents + result.billsCents + result.otherCents;
  return result;
}
