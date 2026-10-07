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
