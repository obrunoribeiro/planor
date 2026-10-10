// Pipeline de dados, passo 9 — recalcular `monthly_summaries` (CONTEXTO.md §6.3). Regra pura:
// recebe as transações já processadas e devolve o agregado de cada mês em America/Sao_Paulo.
import type { ExpenseKind } from '../enums';

export type SummaryTransaction = {
  postedAt: Date;
  amountCents: number;
  categoryId: string | null;
  expenseKind: ExpenseKind | null;
  isHidden: boolean;
  isTransfer: boolean;
};

export type SummaryCategory = { id: string; defaultKind: ExpenseKind; includeInAnalysis: boolean };

export type MonthlySummaryResult = {
  month: string;
  incomeCents: number;
  /** Positivo (soma das saídas em módulo), igual ao que o seed grava. */
  spentCents: number;
  byCategory: Record<string, number>;
  fixedCents: number;
  variableCents: number;
};

const monthFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
});

/** Instante UTC → "YYYY-MM" do mês em America/Sao_Paulo (CLAUDE.md, princípio 5). */
export function monthKeySaoPaulo(date: Date): string {
  const parts = monthFormatter.formatToParts(date);
  return `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}`;
}

/**
 * Agrega por mês:
 * - fica de fora: ocultas, transferências (inclui pagamento de fatura) e categorias com
 *   `includeInAnalysis = false` (§6.5);
 * - saída sem categoria conta em `fallbackCategoryId` ("Outros");
 * - fixo/variável: `expenseKind` da transação, senão o `defaultKind` da categoria;
 * - entrada (valor positivo) soma em `incomeCents`.
 * Meses sem nenhuma transação válida não aparecem no resultado.
 */
export function buildMonthlySummaries(
  transactions: readonly SummaryTransaction[],
  categories: readonly SummaryCategory[],
  fallbackCategoryId: string,
): MonthlySummaryResult[] {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const byMonth = new Map<string, MonthlySummaryResult>();

  for (const tx of transactions) {
    if (tx.isHidden || tx.isTransfer || tx.amountCents === 0) continue;

    const categoryId = tx.categoryId ?? fallbackCategoryId;
    const category = categoryById.get(categoryId);
    if (category && !category.includeInAnalysis) continue;

    const month = monthKeySaoPaulo(tx.postedAt);
    let summary = byMonth.get(month);
    if (!summary) {
      summary = { month, incomeCents: 0, spentCents: 0, byCategory: {}, fixedCents: 0, variableCents: 0 };
      byMonth.set(month, summary);
    }

    if (tx.amountCents > 0) {
      summary.incomeCents += tx.amountCents;
      continue;
    }

    const spent = -tx.amountCents;
    summary.spentCents += spent;
    summary.byCategory[categoryId] = (summary.byCategory[categoryId] ?? 0) + spent;
    const kind = tx.expenseKind ?? category?.defaultKind ?? 'variable';
    if (kind === 'fixed') summary.fixedCents += spent;
    else summary.variableCents += spent;
  }

  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** Variação % do gasto contra o mês anterior, arredondada. `null` sem mês anterior com gasto —
 * nunca inventa um número (§6.4, "vs. mês anterior"). */
export function trendVsPreviousPct(currentCents: number, previousCents: number | null | undefined): number | null {
  if (!previousCents || previousCents <= 0) return null;
  return Math.round(((currentCents - previousCents) / previousCents) * 100);
}

/** "2026-10" → "2026-09". */
export function previousMonthKey(monthKey: string): string {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
}

/** Os `count` meses terminando em `monthKey`, do mais antigo pro mais novo: ("2026-10", 3) →
 * ["2026-08", "2026-09", "2026-10"]. */
export function lastMonthKeys(monthKey: string, count: number): string[] {
  const keys = [monthKey];
  while (keys.length < count) keys.unshift(previousMonthKey(keys[0]!));
  return keys;
}

/**
 * Média mensal de uma categoria (Gastos · Categoria, "gráfico dos últimos 6 meses com a média",
 * CONTEXTO.md §6.5). Só entram meses em que o usuário JÁ TINHA dado (`hasData`) — um mês antes
 * de conectar o banco não é "gastou zero", é "não sabemos", e puxaria a média pra baixo. Um mês
 * com dado e zero nessa categoria entra como zero, normal. `null` sem nenhum mês com dado.
 */
export function monthlyAverageCents(months: readonly { amountCents: number; hasData: boolean }[]): number | null {
  const withData = months.filter((m) => m.hasData);
  if (withData.length === 0) return null;
  return Math.round(withData.reduce((sum, m) => sum + m.amountCents, 0) / withData.length);
}
