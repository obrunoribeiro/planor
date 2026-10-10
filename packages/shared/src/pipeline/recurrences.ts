// Pipeline de dados, passo 5 — assinaturas e recorrências (CONTEXTO.md §6.3).
//
// Regra do CONTEXTO: mesmo comerciante, valor parecido (±10%) e intervalo de 28 a 35 dias, por
// pelo menos 2 ocorrências. O que os dados reais pediram a mais (conta do Bruno, 2026-10-10):
//   - reajuste: o Spotify foi de R$ 31,90 pra R$ 40,90 (+28%). Uma alta de até 50% entre duas
//     cobranças seguidas continua a série (e entra no histórico de preço); queda > 10% quebra;
//   - o mesmo serviço pode ter duas assinaturas (Adoreshare dia 8 e dia 27): as séries são
//     montadas cobrança a cobrança, não uma por comerciante;
//   - comerciante com mais de 3 cobranças por mês no período não é assinatura, é compra
//     frequente que caiu no intervalo por acaso (TikTok, padaria, App Store com vários serviços);
//   - IOF de compra internacional se repete junto com a assinatura, mas é imposto: fica de fora;
//   - código solto no nome ("Dm *Spotify P46c74f8c8") não separa o comerciante.

import type { AmountCents } from '../money';
import { normalizeForMatch, normalizeMerchantName } from './normalize';

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_GAP_DAYS = 28;
const MAX_GAP_DAYS = 35;
const SIMILAR = 0.1; // ±10%
const MAX_PRICE_RISE = 0.5; // reajuste de até +50% entre duas cobranças
const MAX_CHARGES_PER_MONTH = 3;
/** Sem cobrança há mais que isso, a série terminou (o usuário cancelou ou o banco parou de mandar). */
const ACTIVE_WITHIN_DAYS = 45;
const BILL_CATEGORIES = new Set(['Moradia', 'Contas da casa', 'Educação', 'Saúde']);

export type RecurrenceTransaction = {
  id: string;
  descriptionRaw: string;
  merchantName: string | null;
  postedAt: Date;
  /** Negativo = gasto. */
  amountCents: AmountCents;
  categoryName: string | null;
};

export type DetectedRecurrence = {
  /** Identidade do comerciante pra comparar entre execuções (sem acento, caixa ou códigos). */
  merchantKey: string;
  merchantName: string;
  kind: 'subscription' | 'recurring_bill';
  /** Assinatura: a última cobrança. Fixo recorrente: média das 3 últimas (§6.6, "estimadas"). */
  amountCents: AmountCents;
  estimated: boolean;
  cadenceDays: number;
  lastChargeAt: Date;
  nextChargeAt: Date;
  /** Cada mudança de valor maior que 10%, em ordem: [{ amountCents, at }]. */
  priceHistory: { amountCents: AmountCents; at: string }[];
  transactionIds: string[];
};

/** "Dm *Spotify P46c74f8c8" e "Spotify" → "spotify". */
export function recurrenceMerchantKey(merchantName: string): string {
  const key = normalizeForMatch(merchantName);
  const words = key.split(' ').filter((word) => !/\d/.test(word));
  return words.length > 0 ? words.join(' ') : key;
}

function continuesSeries(previousCents: number, currentCents: number): boolean {
  const change = (currentCents - previousCents) / previousCents;
  return Math.abs(change) <= SIMILAR || (change > 0 && change <= MAX_PRICE_RISE);
}

type Charge = { tx: RecurrenceTransaction; cents: number; at: number };

/** Nome que mais aparece na série (empate: o mais recente) — evita "Spotify P46c74f8c8" quando
 * uma das cobranças veio com código. */
function displayName(series: Charge[]): string {
  const counts = new Map<string, number>();
  for (const c of series) {
    const name = c.tx.merchantName ?? normalizeMerchantName(c.tx.descriptionRaw);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let best = '';
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count >= bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

export function detectRecurrences(transactions: RecurrenceTransaction[], now: Date): DetectedRecurrence[] {
  const byMerchant = new Map<string, Charge[]>();
  for (const tx of transactions) {
    if (tx.amountCents >= 0 || tx.postedAt.getTime() > now.getTime()) continue;
    if (/^iof\b/.test(normalizeForMatch(tx.descriptionRaw))) continue;
    const key = recurrenceMerchantKey(tx.merchantName ?? normalizeMerchantName(tx.descriptionRaw));
    const charges = byMerchant.get(key) ?? [];
    charges.push({ tx, cents: Math.abs(tx.amountCents), at: tx.postedAt.getTime() });
    byMerchant.set(key, charges);
  }

  const result: DetectedRecurrence[] = [];
  for (const [merchantKey, charges] of byMerchant) {
    charges.sort((a, b) => a.at - b.at);

    // Cada cobrança entra na série cujo último intervalo fica mais perto de 30 dias.
    const series: Charge[][] = [];
    for (const charge of charges) {
      let best: Charge[] | undefined;
      for (const s of series) {
        const last = s[s.length - 1]!;
        const gap = (charge.at - last.at) / DAY_MS;
        if (gap < MIN_GAP_DAYS || gap > MAX_GAP_DAYS || !continuesSeries(last.cents, charge.cents)) continue;
        if (!best || Math.abs(gap - 30) < Math.abs((charge.at - best[best.length - 1]!.at) / DAY_MS - 30)) best = s;
      }
      if (best) best.push(charge);
      else series.push([charge]);
    }

    for (const s of series) {
      if (s.length < 2) continue;
      const first = s[0]!;
      const last = s[s.length - 1]!;
      if ((now.getTime() - last.at) / DAY_MS > ACTIVE_WITHIN_DAYS) continue;

      const months = Math.max(1, (last.at - first.at) / DAY_MS / 30.4);
      const chargesInSpan = charges.filter((c) => c.at >= first.at && c.at <= last.at).length;
      if (chargesInSpan / months > MAX_CHARGES_PER_MONTH) continue;

      const category = last.tx.categoryName;
      const kind = category && BILL_CATEGORIES.has(category) ? 'recurring_bill' : 'subscription';
      const recent = s.slice(-3).map((c) => c.cents);
      const average = Math.round(recent.reduce((sum, c) => sum + c, 0) / recent.length);
      const varies = recent.some((c) => Math.abs(c - last.cents) / last.cents > 0.01);
      const cadenceDays = Math.round((last.at - first.at) / DAY_MS / (s.length - 1));

      const priceHistory: DetectedRecurrence['priceHistory'] = [{ amountCents: first.cents, at: first.tx.postedAt.toISOString() }];
      for (const c of s.slice(1)) {
        const previous = priceHistory[priceHistory.length - 1]!.amountCents;
        if (Math.abs(c.cents - previous) / previous > SIMILAR) priceHistory.push({ amountCents: c.cents, at: c.tx.postedAt.toISOString() });
      }

      result.push({
        merchantKey,
        merchantName: displayName(s),
        kind,
        amountCents: kind === 'recurring_bill' ? average : last.cents,
        estimated: kind === 'recurring_bill' && varies,
        cadenceDays,
        lastChargeAt: last.tx.postedAt,
        nextChargeAt: new Date(last.at + cadenceDays * DAY_MS),
        priceHistory,
        transactionIds: s.map((c) => c.tx.id),
      });
    }
  }

  return result.sort((a, b) => b.amountCents - a.amountCents);
}
