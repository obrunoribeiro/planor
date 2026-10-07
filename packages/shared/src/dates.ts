const MONTH_ABBREV_PT_BR = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const;

/** "2026-11" → "Nov". Usado nos cards de "já comprometido" (Home e Futuro, CONTEXTO.md §6.4/§6.6). */
export function monthAbbrevPtBR(monthKey: string): string {
  const month = Number(monthKey.slice(5, 7));
  return MONTH_ABBREV_PT_BR[month - 1] ?? monthKey;
}

const MONTH_NAMES_PT_BR = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

/** "2026-11" → "novembro". Usado em "Já comprometido até [mês]" (CONTEXTO.md §6.6). */
export function monthNamePtBR(monthKey: string): string {
  const month = Number(monthKey.slice(5, 7));
  return MONTH_NAMES_PT_BR[month - 1] ?? monthKey;
}

/**
 * Intervalo [início, fim) do mês "YYYY-MM" em America/Sao_Paulo, como instantes UTC — pra
 * filtrar colunas `timestamptz` (ex.: `transactions.posted_at`) pelo mês local certo (CLAUDE.md,
 * princípio 5). Fixo em UTC-03:00: o Brasil aboliu o horário de verão em 2019.
 */
export function monthRangeSaoPaulo(monthKey: string): { start: Date; end: Date } {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  return {
    start: new Date(Date.UTC(year, month - 1, 1, 3, 0, 0)),
    end: new Date(Date.UTC(year, month, 1, 3, 0, 0)),
  };
}
