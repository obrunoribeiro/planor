// Formatação de texto específica de telas (pt-BR) — não é regra de cálculo (essas moram em
// `packages/shared`), só como exibir datas/nomes que a API já devolve em formato cru.
import { monthNamePtBR } from '@planor/shared';

export { monthNamePtBR };

/** "2026-10" → "31 de outubro" (último dia do mês, usado em "Sobra prevista até ..."). */
export function untilEndOfMonthLabel(monthKey: string): string {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  const lastDay = new Date(year, month, 0).getDate();
  return `${lastDay} de ${monthNamePtBR(monthKey)}`;
}

/** "Bruno" → "B". Sem nome ainda (perfil incompleto), cai num "?" neutro. */
export function initialsFromName(name: string | null | undefined): string {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

const MONTH_ABBREV_PT_BR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2027-07-01" → "jul/27" (última parcela, card de Parcelamentos). */
export function monthYearShortLabel(dateKey: string): string {
  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7));
  return `${MONTH_ABBREV_PT_BR[month - 1]}/${String(year).slice(-2)}`;
}

/** "2026-11-10" → "vence 10/11" (fatura do cartão, tela Futuro). */
export function dueDayMonthLabel(dateKey: string): string {
  const month = dateKey.slice(5, 7);
  const day = dateKey.slice(8, 10);
  return `vence ${day}/${month}`;
}

/** "novembro" → "Novembro" (título de seção). */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function todaySaoPauloDateKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

/** "2026-10-04" → "Hoje" / "Ontem" / "4 de outubro" (cabeçalho de grupo em Transações). */
export function dayGroupLabel(dateKey: string): string {
  if (dateKey === todaySaoPauloDateKey()) return 'Hoje';

  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7));
  const day = Number(dateKey.slice(8, 10));
  const yesterday = new Date(Date.UTC(year, month - 1, day - 1));
  const yesterdayKey = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterday.getUTCDate()).padStart(2, '0')}`;
  if (dateKey === yesterdayKey) return 'Ontem';

  return `${day} de ${monthNamePtBR(`${year}-${String(month).padStart(2, '0')}`)}`;
}
