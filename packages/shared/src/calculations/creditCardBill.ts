// Fatura atual do cartão — CONTEXTO.md §6.10 ("Contas e cartões": saldo da conta e fatura do
// cartão).
//
//   fatura_atual = limite_usado − Σ lançamentos de faturas futuras
//
// O limite usado (que o agregador devolve como saldo da conta de crédito) inclui as parcelas que
// já foram lançadas pras próximas faturas. A fatura aberta é a mais antiga que ainda não fechou
// (lançamentos sem `billId`); o que estiver previsto pra um mês depois dela é futuro.
//
// Não dá pra somar só os lançamentos da fatura aberta: compras recentes entram no limite usado
// antes de o banco entregar a transação (na conta real do Bruno, em 2026-10-10, faltavam
// R$ 1.410,07 nas transações e a conta pelo limite bateu no centavo com o app do banco).
//
// Limitação conhecida: entre o fechamento e o pagamento, a fatura fechada ainda está no limite
// usado, então o valor fica fatura fechada + fatura aberta.

import type { AmountCents } from '../money';

export type CardBillEntry = {
  /** Mês previsto da fatura, "YYYY-MM". Nulo quando o agregador não informa. */
  billMonth: string | null;
  /** Presente quando o lançamento já está numa fatura fechada. */
  billId: string | null;
  /** Positivo = gasto, negativo = crédito/estorno. */
  amountCents: AmountCents;
};

export function currentBillCents(usedLimitCents: AmountCents, entries: CardBillEntry[]): AmountCents {
  const open = entries.filter((entry) => entry.billId === null && entry.billMonth !== null);
  if (open.length === 0) return Math.max(0, usedLimitCents);

  const openMonth = open.map((entry) => entry.billMonth!).sort()[0]!;
  const futureCents = open.filter((entry) => entry.billMonth! > openMonth).reduce((sum, entry) => sum + entry.amountCents, 0);

  return Math.max(0, usedLimitCents - futureCents);
}

/** Próximo vencimento da fatura a partir do dia de vencimento do cartão ("YYYY-MM-DD"), contando
 * hoje (America/Sao_Paulo). Dia que não existe no mês (ex.: 31 em novembro) vira o último dia. */
export function nextDueDateKey(dueDay: number, todayKey: string): string {
  const year = Number(todayKey.slice(0, 4));
  const month = Number(todayKey.slice(5, 7));
  const day = Number(todayKey.slice(8, 10));
  const build = (y: number, m: number) => {
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const d = Math.min(dueDay, lastDay);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };
  const thisMonth = build(year, month);
  if (Number(thisMonth.slice(8, 10)) >= day) return thisMonth;
  return month === 12 ? build(year + 1, 1) : build(year, month + 1);
}

/**
 * Compras que já estão na fatura aberta mas que o banco ainda não mandou como transação:
 *
 *   não_detalhadas = fatura_atual − Σ gastos da fatura aberta já recebidos
 *
 * (conta real do Bruno em 2026-10-10: R$ 6.466,23 − R$ 5.056,16 = R$ 1.410,07). Só gastos entram
 * na soma — estorno e pagamento ficariam de fora de propósito: na dúvida, o número sai menor, nunca
 * inventa gasto (§1, "Honestidade nas telas").
 *
 * Devolve 0 quando a conta não é confiável:
 *   - a última fatura fechada ainda não venceu (`lastClosedDueDateKey` ≥ hoje): o limite usado
 *     ainda tem a fatura fechada inteira, e a diferença seria ela, não compra nova;
 *   - nenhum lançamento conhecido na fatura aberta (logo depois do fechamento).
 */
export function undetailedBillCents(input: {
  currentBillCents: AmountCents;
  entries: CardBillEntry[];
  lastClosedDueDateKey: string | null;
  todayKey: string;
}): AmountCents {
  if (!input.lastClosedDueDateKey || input.lastClosedDueDateKey >= input.todayKey) return 0;

  const open = input.entries.filter((entry) => entry.billId === null && entry.billMonth !== null);
  if (open.length === 0) return 0;
  const openMonth = open.map((entry) => entry.billMonth!).sort()[0]!;
  const detailedCents = open
    .filter((entry) => entry.billMonth === openMonth && entry.amountCents > 0)
    .reduce((sum, entry) => sum + entry.amountCents, 0);

  return Math.max(0, input.currentBillCents - detailedCents);
}
