// Metas e limites de categoria — CONTEXTO.md §6.8 e §6.5 ("Limite de categoria").
//
// Ritmo sugerido = o que falta ÷ meses (ou semanas) até o prazo. "No ritmo atual" = o que já foi
// guardado por mês desde que a meta foi criada, projetado até completar. O Planor não move
// dinheiro: tudo aqui é sobre valores que o usuário registrou.

import { monthNamePtBR } from '../dates';
import type { AmountCents } from '../money';
import { formatCents } from '../money';
import { addMonthsToKey, monthsBetweenKeys } from '../pipeline/installments';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Meses inteiros do mês de hoje até o mês do prazo (mínimo 1): "2026-10-12" → "2026-12-15" = 2. */
export function monthsUntil(todayKey: string, deadlineKey: string): number {
  return Math.max(1, monthsBetweenKeys(todayKey.slice(0, 7), deadlineKey.slice(0, 7)));
}

/** Semanas até o prazo, arredondando pra cima (mínimo 1). */
export function weeksUntil(todayKey: string, deadlineKey: string): number {
  const days =
    (Date.parse(`${deadlineKey}T00:00:00Z`) - Date.parse(`${todayKey}T00:00:00Z`)) / DAY_MS;
  return Math.max(1, Math.ceil(days / 7));
}

/** Quanto guardar por período pra completar: o que falta ÷ períodos ("Dá R$ 333,33 por mês"). */
export function paceCents(input: {
  targetCents: AmountCents;
  savedCents: AmountCents;
  periods: number;
}): AmountCents {
  const remaining = Math.max(0, input.targetCents - input.savedCents);
  return Math.round(remaining / Math.max(1, input.periods));
}

/**
 * Mês em que a meta completa no ritmo atual: o guardado por mês desde a criação (contando o mês
 * de criação) aplicado ao que falta. Nulo sem nada guardado ou já completa.
 */
export function projectedFinishMonth(input: {
  targetCents: AmountCents;
  savedCents: AmountCents;
  createdKey: string;
  todayKey: string;
}): string | null {
  const remaining = input.targetCents - input.savedCents;
  if (input.savedCents <= 0 || remaining <= 0) return null;
  const monthsElapsed =
    monthsBetweenKeys(input.createdKey.slice(0, 7), input.todayKey.slice(0, 7)) + 1;
  const perMonth = input.savedCents / monthsElapsed;
  return addMonthsToKey(input.todayKey.slice(0, 7), Math.ceil(remaining / perMonth));
}

export type LimitStatus = 'not_started' | 'ok' | 'warning' | 'exceeded';

/** Situação do limite de categoria no mês: avisa em `alertAtPct` (ex.: 0,8) e estoura acima do total. */
export function categoryLimitStatus(input: {
  spentCents: AmountCents;
  targetCents: AmountCents;
  alertAtPct: number | null;
  startsMonth: string | null;
  monthKey: string;
}): LimitStatus {
  if (input.startsMonth && input.monthKey < input.startsMonth) return 'not_started';
  if (input.spentCents > input.targetCents) return 'exceeded';
  if (input.alertAtPct !== null && input.spentCents >= input.targetCents * input.alertAtPct)
    return 'warning';
  return 'ok';
}

/** "15 de dezembro"; de outro ano, "12 de outubro de 2027". */
function dayMonthLabel(dateKey: string, todayKey: string): string {
  const label = `${Number(dateKey.slice(8, 10))} de ${monthNamePtBR(dateKey.slice(0, 7))}`;
  return dateKey.slice(0, 4) === todayKey.slice(0, 4)
    ? label
    : `${label} de ${dateKey.slice(0, 4)}`;
}

export type GoalForCaption =
  | {
      type: 'savings';
      targetCents: AmountCents;
      savedCents: AmountCents;
      deadline: string | null;
      createdKey: string;
    }
  | {
      type: 'category_limit';
      targetCents: AmountCents;
      spentCents: AmountCents;
      alertAtPct: number | null;
      startsMonth: string | null;
    };

/** Linha de contexto do card da meta (Figma 51:1177), ex.: "Faltam R$ 1.800,00 · no ritmo atual, em dezembro". */
export function goalCaption(goal: GoalForCaption, todayKey: string): string {
  if (goal.type === 'category_limit') {
    const status = categoryLimitStatus({ ...goal, monthKey: todayKey.slice(0, 7) });
    if (status === 'not_started') return `Começa em 1º de ${monthNamePtBR(goal.startsMonth!)}`;
    if (status === 'exceeded')
      return `Passou ${formatCents(goal.spentCents - goal.targetCents)} do limite este mês`;
    return `Sobram ${formatCents(goal.targetCents - goal.spentCents)} este mês`;
  }
  const remaining = goal.targetCents - goal.savedCents;
  if (remaining <= 0) return 'Meta alcançada';
  if (goal.deadline) {
    const perMonth = paceCents({ ...goal, periods: monthsUntil(todayKey, goal.deadline) });
    return `Até ${dayMonthLabel(goal.deadline, todayKey)} · guarde ${formatCents(perMonth)} por mês`;
  }
  const finish = projectedFinishMonth({ ...goal, todayKey });
  return finish
    ? `Faltam ${formatCents(remaining)} · no ritmo atual, em ${monthNamePtBR(finish)}`
    : `Faltam ${formatCents(remaining)}`;
}

/** "Ritmo sugerido" do detalhe (Figma 51:1249): por semana até o prazo, ou o ritmo atual. Nulo se não há o que sugerir. */
export function suggestedPaceText(
  goal: Extract<GoalForCaption, { type: 'savings' }>,
  todayKey: string,
): string | null {
  const remaining = goal.targetCents - goal.savedCents;
  if (remaining <= 0) return null;
  if (goal.deadline) {
    const perWeek = paceCents({ ...goal, periods: weeksUntil(todayKey, goal.deadline) });
    return `${formatCents(perWeek)} por semana completa a meta até ${dayMonthLabel(goal.deadline, todayKey)}.`;
  }
  const finish = projectedFinishMonth({ ...goal, todayKey });
  return finish
    ? `No ritmo de agora, você completa a meta em ${monthNamePtBR(finish)} de ${finish.slice(0, 4)}.`
    : null;
}

/** "por mês · cerca de 8 pedidos" (Figma 46:934): quantas compras do ticket médio cabem no limite. */
export function purchasesWithinLimit(
  targetCents: AmountCents,
  averageTicketCents: AmountCents | null,
): number | null {
  if (!averageTicketCents || averageTicketCents <= 0) return null;
  return Math.max(1, Math.round(targetCents / averageTicketCents));
}

/** Valor em que o aviso dispara ("Te aviso ao passar de R$ 240,00"). */
export function limitAlertCents(targetCents: AmountCents, alertAtPct: number): AmountCents {
  return Math.round(targetCents * alertAtPct);
}
