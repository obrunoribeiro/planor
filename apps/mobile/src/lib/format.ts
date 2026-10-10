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

function saoPauloDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date);
}

/** ISO → "set/27" (validade do consentimento, Contas e cartões). */
export function monthYearShortFromIso(iso: string): string {
  return monthYearShortLabel(saoPauloDateKey(new Date(iso)));
}

/** ISO → "28/09" (data curta, ex.: "Acesso expirou em 28/09"). */
export function dayMonthFromIso(iso: string): string {
  const key = saoPauloDateKey(new Date(iso));
  return `${key.slice(8, 10)}/${key.slice(5, 7)}`;
}

/** ISO → "4 de outubro de 2027" (datas do consentimento, tela Conexão). */
export function longDateFromIso(iso: string): string {
  const key = saoPauloDateKey(new Date(iso));
  return `${Number(key.slice(8, 10))} de ${monthNamePtBR(key.slice(0, 7))} de ${key.slice(0, 4)}`;
}

/** ISO → "há 5 minutos" / "há 2 horas" / "ontem" / "em 4/10" (última atualização). */
export function relativeTimeLabel(iso: string, now = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'agora há pouco';
  if (minutes < 60) return `há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  if (dayGroupLabel(saoPauloDateKey(new Date(iso))) === 'Ontem') return 'ontem';
  return `em ${dayMonthFromIso(iso)}`;
}

/** ISO → "hoje, 08:42" / "ontem, 08:42" / "4/10, 08:42" (sheet "Não conseguimos atualizar"). */
export function dayTimeLabel(iso: string): string {
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(date);
  const group = dayGroupLabel(saoPauloDateKey(date));
  const day = group === 'Hoje' ? 'hoje' : group === 'Ontem' ? 'ontem' : dayMonthFromIso(iso);
  return `${day}, ${time}`;
}

/** "Nubank" → "NU", "Banco Inter" → "IN", "Itaú" → "IT" (avatar do banco, como no Figma: as
 * duas primeiras letras do nome, sem o "Banco" na frente). */
export function institutionInitials(name: string): string {
  const brand = name.trim().replace(/^banco\s+/i, '');
  return (brand || name).slice(0, 2).toUpperCase();
}
