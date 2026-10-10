// Plano da semana — CONTEXTO.md §6.4 e §9 (`weekly-plan`, segunda 6h).
//
// De 1 a 3 itens, cada um com tipo, título, descrição, uma ação que leva a uma tela e um critério
// de conclusão. Tipos combinados com o Bruno em 2026-10-10 (os exemplos do CONTEXTO dependem de
// metas e da marcação de uso das assinaturas, que ainda não existem):
//   - `income`: a renda não está preenchida → conclui sozinho quando for preenchida;
//   - `card_bill`: uma fatura vence nesta semana → o usuário marca;
//   - `subscription_usage`: assinaturas ativas sem o uso marcado ("Marcar assinaturas sem uso",
//     exemplo do CONTEXTO) → conclui sozinho quando todas tiverem o uso marcado;
//   - `category_limit`: uma categoria variável está acima do ritmo dos últimos 3 meses →
//     limite sugerido pra semana, com o quanto já foi gasto; o usuário marca;
//   - `categorize`: compras do mês sem categoria → as 10 maiores; conclui sozinho quando todas
//     tiverem categoria.
// Prioridade nessa ordem; no máximo 3.

import type { AmountCents } from '../money';
import { formatCents } from '../money';
import { monthNamePtBR } from '../dates';

export type WeeklyPlanItemType = 'income' | 'card_bill' | 'subscription_usage' | 'category_limit' | 'categorize';

export type WeeklyPlanItem = {
  /** Versão do formato — plano antigo (ex.: do seed) sem isso é gerado de novo. */
  version: 1;
  type: WeeklyPlanItemType;
  title: string;
  description: string;
  actionLabel: string;
  actionRoute: string;
  completed: boolean;
  /** "YYYY-MM-DD" em America/Sao_Paulo. */
  completedAt: string | null;
  completedAutomatically: boolean;
  /** O que a avaliação ao vivo precisa pra atualizar descrição e conclusão. */
  data: {
    categoryId?: string;
    categoryName?: string;
    limitCents?: AmountCents;
    transactionIds?: string[];
    bank?: string;
    amountCents?: AmountCents;
    dueDateKey?: string;
  };
};

const MAX_ITEMS = 3;
const MAX_TO_CATEGORIZE = 10;
/** Acima do ritmo = gasto do mês até hoje passou 15% do esperado pela média. */
const PACE_TOLERANCE = 1.15;
/** Categoria com média menor que isso não vale um item da semana. */
const MIN_CATEGORY_AVERAGE_CENTS = 10_000;

function addDaysToKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysInMonth(dateKey: string): number {
  return new Date(Date.UTC(Number(dateKey.slice(0, 4)), Number(dateKey.slice(5, 7)), 0)).getUTCDate();
}

/** Segunda-feira da semana de `todayKey` ("YYYY-MM-DD", já no fuso de São Paulo). */
export function weekStartKey(todayKey: string): string {
  const weekday = new Date(`${todayKey}T12:00:00Z`).getUTCDay(); // 0 = domingo
  return addDaysToKey(todayKey, weekday === 0 ? -6 : 1 - weekday);
}

export function weekEndKey(startKey: string): string {
  return addDaysToKey(startKey, 6);
}

/** "5 a 11 de outubro" / "28 de setembro a 4 de outubro". */
export function weekRangeLabel(startKey: string): string {
  const endKey = weekEndKey(startKey);
  const startDay = Number(startKey.slice(8, 10));
  const endDay = Number(endKey.slice(8, 10));
  const endMonth = monthNamePtBR(endKey.slice(0, 7));
  if (startKey.slice(0, 7) === endKey.slice(0, 7)) return `${startDay} a ${endDay} de ${endMonth}`;
  return `${startDay} de ${monthNamePtBR(startKey.slice(0, 7))} a ${endDay} de ${endMonth}`;
}

function dayMonthLabel(dateKey: string): string {
  return `${Number(dateKey.slice(8, 10))} de ${monthNamePtBR(dateKey.slice(0, 7))}`;
}

export type WeeklyPlanInput = {
  todayKey: string;
  monthlyIncomeCents: AmountCents | null;
  /** Faturas abertas dos cartões conectados, com o próximo vencimento. */
  cardBills: { bank: string; amountCents: AmountCents; dueDateKey: string }[];
  /** Por categoria: gasto do mês até hoje e média mensal dos 3 meses anteriores. */
  categories: { categoryId: string; name: string; kind: 'fixed' | 'variable'; monthToDateCents: AmountCents; averageMonthlyCents: AmountCents | null }[];
  /** Saídas do mês sem categoria (valor positivo). */
  uncategorized: { id: string; amountCents: AmountCents }[];
  /** Assinaturas ativas que o usuário ainda não disse se usa. */
  subscriptionsWithoutUsage: { amountCents: AmountCents }[];
};

function item(partial: Omit<WeeklyPlanItem, 'version' | 'completed' | 'completedAt' | 'completedAutomatically'>): WeeklyPlanItem {
  return { version: 1, completed: false, completedAt: null, completedAutomatically: false, ...partial };
}

export function buildWeeklyPlan(input: WeeklyPlanInput): WeeklyPlanItem[] {
  const items: WeeklyPlanItem[] = [];
  const start = weekStartKey(input.todayKey);
  const end = weekEndKey(start);

  if (!input.monthlyIncomeCents) {
    items.push(
      item({
        type: 'income',
        title: 'Informar sua renda',
        description: 'Sem ela, o Planor não tem de onde calcular quanto sobra no fim do mês.',
        actionLabel: 'Informar renda',
        actionRoute: '/perfil',
        data: {},
      }),
    );
  }

  const bill = input.cardBills
    .filter((b) => b.amountCents > 0 && b.dueDateKey >= input.todayKey && b.dueDateKey <= end)
    .sort((a, b) => a.dueDateKey.localeCompare(b.dueDateKey))[0];
  if (bill) {
    items.push(
      item({
        type: 'card_bill',
        title: `Separar ${formatCents(bill.amountCents)} para a fatura`,
        description: `A fatura do ${bill.bank} vence em ${dayMonthLabel(bill.dueDateKey)}. Deixe o valor na conta que paga o cartão.`,
        actionLabel: 'Ver contas e cartões',
        actionRoute: '/perfil/contas',
        data: { bank: bill.bank, amountCents: bill.amountCents, dueDateKey: bill.dueDateKey },
      }),
    );
  }

  if (input.subscriptionsWithoutUsage.length > 0) {
    const count = input.subscriptionsWithoutUsage.length;
    const monthlyCents = input.subscriptionsWithoutUsage.reduce((sum, s) => sum + s.amountCents, 0);
    items.push(
      item({
        type: 'subscription_usage',
        title: 'Marcar assinaturas sem uso',
        description: `${count === 1 ? '1 assinatura soma' : `${count} assinaturas somam`} ${formatCents(monthlyCents)} por mês. As que você não usa entram nas sugestões de corte.`,
        actionLabel: 'Ver assinaturas',
        actionRoute: '/futuro/assinaturas',
        data: {},
      }),
    );
  }

  const elapsed = Number(input.todayKey.slice(8, 10)) / daysInMonth(input.todayKey);
  const overPace = input.categories
    .filter((c) => c.kind === 'variable' && c.name !== 'Outros' && (c.averageMonthlyCents ?? 0) >= MIN_CATEGORY_AVERAGE_CENTS)
    .map((c) => ({ ...c, pace: c.monthToDateCents / (c.averageMonthlyCents! * elapsed) }))
    .filter((c) => c.pace > PACE_TOLERANCE)
    .sort((a, b) => b.pace - a.pace)[0];
  if (overPace) {
    const weeklyLimit = Math.max(1000, Math.round((overPace.averageMonthlyCents! * 7) / daysInMonth(input.todayKey) / 1000) * 1000);
    items.push(
      item({
        type: 'category_limit',
        title: `Segurar ${overPace.name.toLowerCase()} até domingo`,
        description: `Limite sugerido: ${formatCents(weeklyLimit)} nesta semana.`,
        actionLabel: `Ver ${overPace.name.toLowerCase()}`,
        actionRoute: `/gastos/categoria/${overPace.categoryId}`,
        data: { categoryId: overPace.categoryId, categoryName: overPace.name, limitCents: weeklyLimit },
      }),
    );
  }

  if (input.uncategorized.length > 0) {
    const biggest = [...input.uncategorized].sort((a, b) => b.amountCents - a.amountCents).slice(0, MAX_TO_CATEGORIZE);
    const month = monthNamePtBR(input.todayKey.slice(0, 7));
    items.push(
      item({
        type: 'categorize',
        title: biggest.length === 1 ? 'Categorizar 1 compra sem categoria' : `Categorizar ${biggest.length} compras sem categoria`,
        description: `${biggest.length === 1 ? 'A maior' : 'As maiores'} de ${month}. Escolha "aplicar a compras parecidas" e o Planor categoriza as próximas sozinho.`,
        actionLabel: 'Ver transações',
        actionRoute: '/gastos/transacoes',
        data: { transactionIds: biggest.map((t) => t.id) },
      }),
    );
  }

  return items.slice(0, MAX_ITEMS);
}

export type WeeklyPlanLiveData = {
  todayKey: string;
  incomeSet: boolean;
  /** Assinaturas ativas ainda sem uso marcado. */
  subscriptionsWithoutUsage: number;
  /** Gasto da semana (segunda até hoje) por categoria. */
  weekSpentByCategory: Record<string, AmountCents>;
  /** Dos `transactionIds` dos itens `categorize`, os que ainda estão sem categoria. */
  stillUncategorizedIds: string[];
};

/** Atualiza descrição (progresso) e conclusão automática com o dado de agora. Não desmarca o que
 * o usuário marcou à mão. */
export function evaluateWeeklyPlan(items: WeeklyPlanItem[], live: WeeklyPlanLiveData): WeeklyPlanItem[] {
  return items.map((current) => {
    const next = { ...current };
    const complete = () => {
      if (next.completed) return;
      next.completed = true;
      next.completedAt = live.todayKey;
      next.completedAutomatically = true;
    };

    if (next.type === 'income' && live.incomeSet) complete();
    if (next.type === 'subscription_usage' && live.subscriptionsWithoutUsage === 0) complete();

    if (next.type === 'category_limit' && next.data.categoryId && next.data.limitCents !== undefined) {
      const spent = live.weekSpentByCategory[next.data.categoryId] ?? 0;
      next.description = `Limite sugerido: ${formatCents(next.data.limitCents)} nesta semana. Você está em ${formatCents(spent)}.`;
    }

    if (next.type === 'categorize' && next.data.transactionIds) {
      const remaining = next.data.transactionIds.filter((id) => live.stillUncategorizedIds.includes(id)).length;
      if (remaining === 0) complete();
      else if (remaining < next.data.transactionIds.length) {
        next.description = `Faltam ${remaining} de ${next.data.transactionIds.length}. Escolha "aplicar a compras parecidas" e o Planor categoriza as próximas sozinho.`;
      }
    }

    return next;
  });
}
