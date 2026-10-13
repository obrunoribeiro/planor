// Alertas — CONTEXTO.md §6.9 (central de alertas) e §6.3, passo 7 (gasto fora do padrão).
//
// Gasto fora do padrão (`unusual_spend`), duas formas:
//   - compra: passa de 1,5× a média por compra da categoria nos últimos 3 meses;
//   - categoria: já usou mais de 80% do habitual do mês antes do dia 20.
// O texto de cada alerta sai daqui (`describeAlert`), igual pra lista e pro push, quando existir.

import type { AmountCents } from '../money';
import { formatCents } from '../money';

/** Compra só é "fora do padrão" com pelo menos esse valor — R$ 12 numa categoria de média R$ 7
 * passa de 1,5×, mas não merece alerta. */
export const UNUSUAL_PURCHASE_MIN_CENTS = 3000;
/** Média por compra só vale com pelo menos esse tanto de compras na categoria. */
export const UNUSUAL_PURCHASE_MIN_HISTORY = 3;
/** Categoria com média mensal menor que isso não dá alerta de ritmo: uma cobrança só (ex.: uma
 * parcela de R$ 46) já passa dos 80%. */
export const PACE_MIN_AVERAGE_CENTS = 10_000;

export type PurchaseCandidate = { id: string; categoryId: string; amountCents: AmountCents };

/** Compras (valores positivos) que passam de 1,5× a média por compra da categoria. No máximo uma
 * por categoria (a maior) — várias compras no mesmo lugar no mesmo dia viram um alerta só. */
export function unusualPurchases(input: {
  candidates: PurchaseCandidate[];
  /** Compras da categoria nos 3 meses anteriores (valores positivos). */
  history: { categoryId: string; amountCents: AmountCents }[];
}): (PurchaseCandidate & { averageCents: AmountCents })[] {
  const byCategory = new Map<string, number[]>();
  for (const row of input.history)
    byCategory.set(row.categoryId, [...(byCategory.get(row.categoryId) ?? []), row.amountCents]);

  const largestByCategory = new Map<string, PurchaseCandidate & { averageCents: AmountCents }>();
  for (const candidate of input.candidates) {
    const amounts = byCategory.get(candidate.categoryId) ?? [];
    if (amounts.length < UNUSUAL_PURCHASE_MIN_HISTORY) continue;
    const averageCents = Math.round(amounts.reduce((sum, a) => sum + a, 0) / amounts.length);
    if (
      candidate.amountCents < UNUSUAL_PURCHASE_MIN_CENTS ||
      candidate.amountCents <= averageCents * 1.5
    )
      continue;
    const current = largestByCategory.get(candidate.categoryId);
    if (!current || candidate.amountCents > current.amountCents)
      largestByCategory.set(candidate.categoryId, { ...candidate, averageCents });
  }
  return [...largestByCategory.values()];
}

/** Categorias variáveis que já passaram de 80% do habitual do mês antes do dia 20. Fixas (aluguel,
 * assinaturas) caem inteiras no começo do mês e dariam alerta todo mês. */
export function categoriesAheadOfPace(input: {
  dayOfMonth: number;
  categories: {
    categoryId: string;
    name: string;
    kind: 'fixed' | 'variable';
    monthToDateCents: AmountCents;
    averageMonthlyCents: AmountCents | null;
  }[];
}) {
  if (input.dayOfMonth >= 20) return [];
  return input.categories.filter(
    (c) =>
      c.kind === 'variable' &&
      c.averageMonthlyCents !== null &&
      c.averageMonthlyCents >= PACE_MIN_AVERAGE_CENTS &&
      c.monthToDateCents > c.averageMonthlyCents * 0.8,
  );
}

/** Tipos que a central sabe mostrar (os outros do §6.9 ainda não são gerados). */
export const KNOWN_ALERT_TYPES = [
  'unusual_spend',
  'subscription_price_up',
  'subscription_charged_after_cancel',
  'statement_closing',
  'consent_expiring',
  'sync_failed',
  'bank_disconnected',
  'limit_80',
  'limit_exceeded',
] as const;

export type AlertTone = 'brand' | 'alert' | 'error' | 'success';

export type AlertView = {
  title: string;
  body: string;
  tone: AlertTone;
  /** Nome do ícone em `@planor/ui`. */
  icon: string;
  /** Rota do app pra onde o alerta leva; nulo quando não leva a lugar nenhum. */
  route: string | null;
  /** Chip "Importantes" da central. */
  important: boolean;
};

type Payload = Record<string, unknown>;
const str = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
const num = (value: unknown) => (typeof value === 'number' ? value : 0);

function daysLabel(days: number): string {
  if (days <= 0) return 'hoje';
  if (days === 1) return 'amanhã';
  return `em ${days} dias`;
}

/** Título, texto, tom, ícone e destino de um alerta, a partir do tipo e do payload gravado. */
export function describeAlert(type: string, payload: Payload): AlertView {
  switch (type) {
    case 'unusual_spend':
      if (payload.kind === 'category') {
        return {
          title: `${str(payload.categoryName, 'Categoria')} acima do normal`,
          body: `Você já gastou ${formatCents(num(payload.monthToDateCents))} este mês, mais de 80% do que costuma gastar no mês inteiro (${formatCents(num(payload.averageMonthlyCents))}).`,
          tone: 'alert',
          icon: 'aviso',
          route: payload.categoryId ? `/gastos/categoria/${str(payload.categoryId)}` : null,
          important: true,
        };
      }
      return {
        title: 'Gasto fora do padrão',
        body: `${formatCents(num(payload.amountCents))} em ${str(payload.merchantName, 'uma compra')}, acima do que você costuma gastar por compra em ${str(payload.categoryName, 'essa categoria')}.`,
        tone: 'brand',
        icon: 'sacola',
        route: payload.transactionId ? `/gastos/transacao/${str(payload.transactionId)}` : null,
        important: true,
      };
    case 'subscription_price_up':
      return {
        title: 'Assinatura mais cara',
        body: `${str(payload.merchantName, 'Uma assinatura')} passou de ${formatCents(num(payload.fromCents))} para ${formatCents(num(payload.toCents))}.`,
        tone: 'alert',
        icon: 'aviso',
        route: payload.recurrenceId
          ? `/futuro/assinatura/${str(payload.recurrenceId)}`
          : '/futuro/assinaturas',
        important: true,
      };
    case 'subscription_charged_after_cancel':
      return {
        title: 'Cobrança depois do cancelamento',
        body: `${str(payload.merchantName, 'Uma assinatura')} cobrou ${formatCents(num(payload.amountCents))} depois que você marcou como cancelada.`,
        tone: 'error',
        icon: 'aviso',
        route: payload.recurrenceId
          ? `/futuro/assinatura/${str(payload.recurrenceId)}`
          : '/futuro/assinaturas',
        important: true,
      };
    case 'statement_closing':
      return {
        title: `Fatura do ${str(payload.bank, 'cartão')} fecha ${daysLabel(num(payload.daysLeft))}`,
        body:
          num(payload.installmentsCents) > 0
            ? `Previsão de ${formatCents(num(payload.totalCents))}, com ${formatCents(num(payload.installmentsCents))} em parcelas.`
            : `Previsão de ${formatCents(num(payload.totalCents))}.`,
        tone: 'brand',
        icon: 'futuro',
        route: payload.accountId ? `/futuro/fatura/${str(payload.accountId)}` : '/futuro',
        important: false,
      };
    case 'limit_80':
      return {
        title: `${str(payload.categoryName, 'Categoria')} perto do limite`,
        body: `Você já gastou ${formatCents(num(payload.spentCents))} dos ${formatCents(num(payload.targetCents))} do mês.`,
        tone: 'alert',
        icon: 'meta',
        route: payload.categoryId ? `/gastos/categoria/${str(payload.categoryId)}` : null,
        important: true,
      };
    case 'limit_exceeded':
      return {
        title: `Limite de ${str(payload.categoryName, 'categoria').toLowerCase()} estourado`,
        body: `Você gastou ${formatCents(num(payload.spentCents))} este mês, acima do limite de ${formatCents(num(payload.targetCents))}.`,
        tone: 'error',
        icon: 'meta',
        route: payload.categoryId ? `/gastos/categoria/${str(payload.categoryId)}` : null,
        important: true,
      };
    case 'consent_expiring':
      return {
        title: `Acesso ao ${str(payload.institutionName, 'banco')} vence ${daysLabel(num(payload.daysLeft))}`,
        body: 'Renove pra continuar recebendo seus dados.',
        tone: 'alert',
        icon: 'banco',
        route: payload.connectionId
          ? `/perfil/acesso-vencendo/${str(payload.connectionId)}`
          : '/perfil/contas',
        important: true,
      };
    case 'sync_failed':
      return {
        title: `Não conseguimos atualizar o ${str(payload.institutionName, 'banco')}`,
        body: 'Vamos tentar de novo sozinhos. Se continuar, reconecte.',
        tone: 'error',
        icon: 'banco',
        route: payload.connectionId
          ? `/perfil/conexao/${str(payload.connectionId)}`
          : '/perfil/contas',
        important: true,
      };
    case 'bank_disconnected':
      return {
        title: `${str(payload.institutionName, 'Banco')} desconectado`,
        body: 'Reconecte para manter seus dados atualizados.',
        tone: 'error',
        icon: 'banco',
        route: payload.connectionId
          ? `/perfil/conexao/${str(payload.connectionId)}`
          : '/perfil/contas',
        important: true,
      };
    default:
      return {
        title: 'Aviso',
        body: '',
        tone: 'brand',
        icon: 'sino',
        route: null,
        important: false,
      };
  }
}
