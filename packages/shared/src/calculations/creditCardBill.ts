// Fatura do cartão — CONTEXTO.md §6.6 ("Fatura do cartão") e §6.10 ("Contas e cartões").
//
// O agregador entrega três coisas:
//   - o limite usado (saldo da conta de crédito);
//   - os lançamentos, cada um com o mês previsto da fatura (`billMonth`, que é o mês do
//     vencimento) e, às vezes, o `billId` da fatura fechada;
//   - a lista de faturas fechadas, com total e pagamentos.
//
//   fatura_aberta = limite_usado − Σ lançamentos de faturas futuras − resto a pagar da fechada
//
// O limite usado inclui as parcelas já lançadas pras próximas faturas e, enquanto não for paga, a
// fatura fechada. Não dá pra somar só os lançamentos da fatura aberta: compras recentes entram no
// limite usado antes de o banco entregar a transação (na conta real do Bruno, em 2026-10-10,
// faltavam R$ 1.410,07 nas transações e a conta pelo limite bateu no centavo com o app do banco).
//
// Não dá pra confiar só no `billId`: em 2026-10-12, um dia depois de a fatura de outubro fechar,
// os lançamentos dela ainda vinham sem `billId` e o pagamento dela (R$ 6.466,23) vinha previsto
// pra fatura de novembro. Por isso o que separa fechada de aberta é o mês da última fatura fechada.

import type { AmountCents } from '../money';
import { addMonthsToKey } from '../pipeline/installments';

export type CardBillEntry = {
  /** Mês previsto da fatura (mês do vencimento), "YYYY-MM". Nulo quando o agregador não informa. */
  billMonth: string | null;
  /** Presente quando o lançamento já está numa fatura fechada. */
  billId: string | null;
  /** Positivo = gasto, negativo = crédito/estorno/pagamento. */
  amountCents: AmountCents;
};

export type ClosedCardBill = {
  /** Mês do vencimento, "YYYY-MM". */
  month: string;
  totalCents: AmountCents;
  /** Soma dos pagamentos que o banco informou pra esta fatura. */
  paidCents: AmountCents;
  /** "YYYY-MM-DD". */
  dueDateKey: string;
};

export type CardBillSummary = {
  /** Mês da fatura aberta, "YYYY-MM". Nulo quando não dá pra saber (sem fatura fechada e sem
   * lançamento com mês previsto). */
  openMonth: string | null;
  openBillCents: AmountCents;
  /** Parte da fatura aberta que o banco ainda não mandou como transação ("compras ainda não
   * detalhadas"). */
  undetailedCents: AmountCents;
  /** Quanto da última fatura fechada ainda falta pagar. */
  closedUnpaidCents: AmountCents;
};

/**
 * Fatura aberta, compras não detalhadas e o que falta pagar da fechada.
 *
 * Compras não detalhadas = fatura aberta − Σ gastos da fatura aberta já recebidos (conta real do
 * Bruno em 2026-10-10: R$ 6.466,23 − R$ 5.056,16 = R$ 1.410,07). Só gastos entram na soma — estorno
 * e pagamento ficam de fora de propósito: na dúvida, o número sai menor, nunca inventa gasto (§1,
 * "Honestidade nas telas"). É 0 sem fatura fechada conhecida ou sem nenhum lançamento na aberta
 * (logo depois do fechamento).
 */
export function cardBillSummary(input: { usedLimitCents: AmountCents; entries: CardBillEntry[]; lastClosed: ClosedCardBill | null }): CardBillSummary {
  const { usedLimitCents, entries, lastClosed } = input;
  const closedUnpaidCents = lastClosed ? Math.max(0, lastClosed.totalCents - lastClosed.paidCents) : 0;

  const open = entries.filter(
    (entry) => entry.billMonth !== null && entry.billId === null && (!lastClosed || entry.billMonth > lastClosed.month),
  );
  const openMonth = lastClosed ? addMonthsToKey(lastClosed.month, 1) : (open.map((entry) => entry.billMonth!).sort()[0] ?? null);
  if (!openMonth) return { openMonth: null, openBillCents: Math.max(0, usedLimitCents - closedUnpaidCents), undetailedCents: 0, closedUnpaidCents };

  const futureCents = open.filter((entry) => entry.billMonth! > openMonth).reduce((sum, entry) => sum + entry.amountCents, 0);
  const openBillCents = Math.max(0, usedLimitCents - futureCents - closedUnpaidCents);

  const detailed = open.filter((entry) => entry.billMonth === openMonth && entry.amountCents > 0);
  const detailedCents = detailed.reduce((sum, entry) => sum + entry.amountCents, 0);
  const undetailedCents = lastClosed && detailed.length > 0 ? Math.max(0, openBillCents - detailedCents) : 0;

  return { openMonth, openBillCents, undetailedCents, closedUnpaidCents };
}

/** Dia `day` do mês `monthKey` ("YYYY-MM-DD"); dia que não existe (ex.: 31 em novembro) vira o
 * último dia do mês. */
export function dayInMonthKey(monthKey: string, day: number): string {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${monthKey}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

/** Fechamento da fatura que vence no mês `monthKey`: no mesmo mês quando o dia de fechamento vem
 * antes do vencimento (Nubank: fecha 11, vence 19), senão no mês anterior. */
export function billClosingDateKey(monthKey: string, closingDay: number, dueDay: number): string {
  return dayInMonthKey(closingDay < dueDay ? monthKey : addMonthsToKey(monthKey, -1), closingDay);
}

/** Próximo vencimento da fatura a partir do dia de vencimento do cartão ("YYYY-MM-DD"), contando
 * hoje (America/Sao_Paulo). Dia que não existe no mês (ex.: 31 em novembro) vira o último dia. */
export function nextDueDateKey(dueDay: number, todayKey: string): string {
  const thisMonth = dayInMonthKey(todayKey.slice(0, 7), dueDay);
  return thisMonth >= todayKey ? thisMonth : dayInMonthKey(addMonthsToKey(todayKey.slice(0, 7), 1), dueDay);
}

export type CardBillToPay = {
  /** `closed` = fatura fechada que ainda não foi paga; `open` = a que ainda recebe compras. */
  kind: 'closed' | 'open';
  month: string;
  amountCents: AmountCents;
  dueDateKey: string;
};

/**
 * A fatura que o usuário tem que pagar a seguir — a dos cards do Futuro, do "a vencer" e do plano
 * da semana. A fechada enquanto falta pagar (mesmo atrasada); depois de paga, a aberta.
 */
export function cardBillToPay(input: {
  lastClosed: ClosedCardBill | null;
  summary: CardBillSummary;
  dueDay: number;
  todayKey: string;
}): CardBillToPay {
  const { lastClosed, summary, dueDay, todayKey } = input;
  if (lastClosed && summary.closedUnpaidCents > 0) {
    return { kind: 'closed', month: lastClosed.month, amountCents: summary.closedUnpaidCents, dueDateKey: lastClosed.dueDateKey };
  }
  const dueDateKey = summary.openMonth ? dayInMonthKey(summary.openMonth, dueDay) : nextDueDateKey(dueDay, todayKey);
  return { kind: 'open', month: dueDateKey.slice(0, 7), amountCents: summary.openBillCents, dueDateKey };
}
