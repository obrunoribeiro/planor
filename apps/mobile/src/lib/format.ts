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

const SAO_PAULO = 'America/Sao_Paulo';

/** ISO → "2026-10-04", no fuso de São Paulo (CONTEXTO.md §3: "hoje"/vencimento usam esse fuso). */
export function saoPauloDateKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SAO_PAULO }).format(new Date(iso));
}

/** ISO → "28/09" (ex.: "Acesso expirou em 28/09"). */
export function dayMonthLabel(iso: string): string {
  const dateKey = saoPauloDateKey(iso);
  return `${dateKey.slice(8, 10)}/${dateKey.slice(5, 7)}`;
}

/** ISO → "4 de outubro de 2026" (Detalhe da conexão). */
export function longDateLabel(iso: string): string {
  const dateKey = saoPauloDateKey(iso);
  return `${Number(dateKey.slice(8, 10))} de ${monthNamePtBR(dateKey.slice(0, 7))} de ${dateKey.slice(0, 4)}`;
}

/** ISO → "há 5 minutos" / "há 5 min" (`short`), pra "atualizado há…". Mais de um dia vira data. */
export function timeAgoLabel(iso: string, { short = false }: { short?: boolean } = {}): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return short ? `há ${minutes} min` : `há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return short ? `há ${hours} h` : `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  return `em ${dayMonthLabel(iso)}`;
}

/** ISO → "hoje, 08:42" / "ontem, 08:42" / "4 de outubro, 08:42" (última atualização de um banco). */
export function dayAndTimeLabel(iso: string): string {
  const time = new Intl.DateTimeFormat('pt-BR', { timeZone: SAO_PAULO, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  const day = dayGroupLabel(saoPauloDateKey(iso));
  return `${day === 'Hoje' || day === 'Ontem' ? day.toLowerCase() : day}, ${time}`;
}
