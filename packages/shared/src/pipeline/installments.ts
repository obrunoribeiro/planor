// Pipeline de dados, passo 4 — parcelas (CONTEXTO.md §6.3).
//
// Cada parcela é uma transação. Duas fontes pro "n de m":
//   1. o agregador (o Pluggy manda número, total e mês da fatura de cada parcela de cartão);
//   2. o sufixo da descrição: "3/10", "03/10", "PARC 03/10", "PARCELA 3 DE 10" (OFX e afins).
//
// Uma compra parcelada = parcelas da mesma conta, mesmo estabelecimento, mesmo total de parcelas e
// mesmo mês da 1ª parcela (mês da parcela − (n − 1)). O valor não entra na chave: o banco
// arredonda e as parcelas da mesma compra podem diferir em 1 centavo (R$ 163,34 + 163,33 + 163,33). O Pluggy já devolve as
// parcelas futuras como transações, mas o cálculo não depende disso: o plano vai da 1ª à última
// parcela pelo número de parcelas, então as futuras ficam projetadas mesmo sem a transação.

import type { AmountCents } from '../money';
import { monthKeySaoPaulo } from './monthlySummary';
import { normalizeForMatch, normalizeMerchantName } from './normalize';

const INSTALLMENT_SUFFIX = /(?:^|\s)(?:parc(?:ela)?\.?\s*)?(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})\s*$/i;

/** "Cold City 2/3" → { number: 2, count: 3 }. Nulo se não for parcela (inclui "1/1"). */
export function parseInstallmentSuffix(description: string): { number: number; count: number } | null {
  const match = INSTALLMENT_SUFFIX.exec(description.trim());
  if (!match) return null;
  const number = Number(match[1]);
  const count = Number(match[2]);
  if (count < 2 || number < 1 || number > count) return null;
  return { number, count };
}

/** "2026-10" + 3 → "2027-01". */
export function addMonthsToKey(monthKey: string, months: number): string {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7)) - 1 + months;
  const date = new Date(Date.UTC(year, month, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Quantos meses de `from` até `to` ("2026-10" → "2027-01" = 3). */
export function monthsBetweenKeys(from: string, to: string): number {
  return (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + (Number(to.slice(5, 7)) - Number(from.slice(5, 7)));
}

export type InstallmentTransaction = {
  id: string;
  accountId: string;
  descriptionRaw: string;
  merchantName: string | null;
  postedAt: Date;
  /** Negativo = gasto. Estorno de parcela (positivo) não entra. */
  amountCents: AmountCents;
  /** Do agregador, quando vier. */
  installmentNumber: number | null;
  installmentCount: number | null;
  /** Mês da fatura em que a parcela cai ("YYYY-MM"), quando o agregador informar. */
  billMonth: string | null;
};

export type DetectedInstallmentPlan = {
  accountId: string;
  merchantName: string;
  installmentCents: AmountCents;
  totalCents: AmountCents;
  count: number;
  /** Parcela do mês de referência (1 a `count`). */
  current: number;
  /** Valor de cada parcela que já existe como transação, por mês ("YYYY-MM" → centavos). As que
   * faltam valem `installmentCents`. */
  amountByMonth: Record<string, AmountCents>;
  /** Mês da 1ª e da última parcela ("YYYY-MM"). */
  firstMonth: string;
  lastMonth: string;
  transactionIds: string[];
};

/** Valor que mais aparece (empate: o maior) — a parcela "cheia" quando uma delas vem arredondada. */
function mostCommon(values: number[]): number {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]![0];
}

/**
 * Parcelamentos ainda ativos em `referenceMonth` (a última parcela é desse mês ou depois).
 * Mês de cada parcela = mês da fatura, quando o agregador informa; senão, o mês da transação em
 * America/Sao_Paulo.
 */
export function detectInstallmentPlans(transactions: InstallmentTransaction[], referenceMonth: string): DetectedInstallmentPlan[] {
  const groups = new Map<string, { merchantName: string; tx: InstallmentTransaction; number: number; count: number; month: string }[]>();

  for (const tx of transactions) {
    if (tx.amountCents >= 0) continue;
    const parsed =
      tx.installmentNumber && tx.installmentCount && tx.installmentCount > 1
        ? { number: tx.installmentNumber, count: tx.installmentCount }
        : parseInstallmentSuffix(tx.descriptionRaw);
    if (!parsed) continue;

    const month = tx.billMonth ?? monthKeySaoPaulo(tx.postedAt);
    const firstMonth = addMonthsToKey(month, -(parsed.number - 1));
    const merchantName = tx.merchantName ?? normalizeMerchantName(tx.descriptionRaw);
    const key = [tx.accountId, normalizeForMatch(merchantName), parsed.count, firstMonth].join('|');

    const group = groups.get(key) ?? [];
    group.push({ merchantName, tx, number: parsed.number, count: parsed.count, month });
    groups.set(key, group);
  }

  const plans: DetectedInstallmentPlan[] = [];
  for (const group of groups.values()) {
    const first = group[0]!;
    const firstMonth = addMonthsToKey(first.month, -(first.number - 1));
    const lastMonth = addMonthsToKey(firstMonth, first.count - 1);
    if (lastMonth < referenceMonth) continue;

    // Mesma parcela repetida (ex.: reprocessamento com id externo diferente) conta uma vez só.
    const byNumber = new Map(group.map((g) => [g.number, g]));
    const known = [...byNumber.values()];
    const installmentCents = mostCommon(known.map((g) => Math.abs(g.tx.amountCents)));
    const knownCents = known.reduce((sum, g) => sum + Math.abs(g.tx.amountCents), 0);
    const current = Math.min(first.count, Math.max(1, monthsBetweenKeys(firstMonth, referenceMonth) + 1));

    plans.push({
      accountId: first.tx.accountId,
      merchantName: first.merchantName,
      installmentCents,
      totalCents: knownCents + installmentCents * (first.count - known.length),
      count: first.count,
      current,
      amountByMonth: Object.fromEntries(known.map((g) => [addMonthsToKey(firstMonth, g.number - 1), Math.abs(g.tx.amountCents)])),
      firstMonth,
      lastMonth,
      transactionIds: known.map((g) => g.tx.id),
    });
  }

  return plans.sort((a, b) => a.lastMonth.localeCompare(b.lastMonth) || b.installmentCents - a.installmentCents);
}

export type InstallmentPlanProgress = {
  paidCents: AmountCents;
  remainingCents: AmountCents;
  /** Vencimento da próxima parcela ("YYYY-MM-DD"), ou só o mês ("YYYY-MM") sem o dia de
   * vencimento do cartão. Nulo quando a parcela do mês é a última. */
  nextDue: string | null;
};

/**
 * "Já pago", "falta pagar" e "próxima parcela" do detalhe do parcelamento (§6.6). Como no Figma
 * (31:519: "3/10", R$ 240 → já pago R$ 720), a parcela do mês de referência conta como paga, e a
 * próxima é a da fatura do mês seguinte.
 */
export function installmentPlanProgress(
  plan: { installmentCents: AmountCents; totalCents: AmountCents; count: number; current: number },
  referenceMonth: string,
  dueDay: number | null,
): InstallmentPlanProgress {
  // "Falta" pelas parcelas que ainda vêm, e "já pago" pelo que sobra do total — o banco arredonda
  // e a 1ª parcela costuma ter 1 centavo a mais (R$ 163,34 + 163,33 + 163,33), então contar pelo
  // outro lado deixaria centavos "faltando" no fim.
  const remainingCents = plan.installmentCents * Math.max(0, plan.count - plan.current);
  const paidCents = plan.totalCents - remainingCents;
  if (plan.current >= plan.count) return { paidCents, remainingCents, nextDue: null };

  const nextMonth = addMonthsToKey(referenceMonth, 1);
  if (!dueDay) return { paidCents, remainingCents, nextDue: nextMonth };
  const lastDay = new Date(Date.UTC(Number(nextMonth.slice(0, 4)), Number(nextMonth.slice(5, 7)), 0)).getUTCDate();
  return { paidCents, remainingCents, nextDue: `${nextMonth}-${String(Math.min(dueDay, lastDay)).padStart(2, '0')}` };
}
