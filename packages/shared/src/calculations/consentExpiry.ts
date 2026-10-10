// Consentimento do Open Finance vencendo — CONTEXTO.md §6.2 ("avisar com 7 dias e 1 dia de
// antecedência") e §6.9 (`consent_expiring`). Regra pura usada pelo job diário
// `consent-expiry-check` (§9).

/** Marcos de aviso, do mais distante pro mais próximo. */
export const CONSENT_WARNING_DAYS = [7, 1] as const;
export type ConsentWarningDay = (typeof CONSENT_WARNING_DAYS)[number];

const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });

/** Dias de calendário (em America/Sao_Paulo) de `now` até `expiresAt`. Vence hoje = 0; já
 * venceu ontem = -1. Conta por dia, não por 24h: vencer às 8h de amanhã é "1 dia". */
export function daysUntilSaoPaulo(expiresAt: Date, now: Date): number {
  const toUtcMidnight = (d: Date) => Date.parse(`${dayFormatter.format(d)}T00:00:00Z`);
  return Math.round((toUtcMidnight(expiresAt) - toUtcMidnight(now)) / 86_400_000);
}

export type ConsentCheckResult =
  | { action: 'expire' }
  | { action: 'warn'; warningDay: ConsentWarningDay; daysLeft: number }
  | { action: 'none' };

/**
 * O que fazer com uma conexão hoje:
 * - já venceu (daysLeft < 0) → `expire` (marca `consent_expired`);
 * - entrou na janela de um marco ainda não avisado → `warn` com o marco MAIS PRÓXIMO alcançado.
 *   Por janela, não por igualdade: se o job não rodar no dia exato (servidor fora do ar), o aviso
 *   sai no dia seguinte em vez de se perder. E se os dois marcos já foram alcançados de uma vez
 *   (ex.: conexão criada com 1 dia de validade), só o de 1 dia sai — não faz sentido avisar "7 dias".
 */
export function checkConsent(
  expiresAt: Date,
  now: Date,
  alreadyWarned: readonly number[],
): ConsentCheckResult {
  const daysLeft = daysUntilSaoPaulo(expiresAt, now);
  if (daysLeft < 0) return { action: 'expire' };

  const reached = CONSENT_WARNING_DAYS.filter((day) => daysLeft <= day);
  const closest = reached[reached.length - 1];
  if (closest === undefined || alreadyWarned.includes(closest)) return { action: 'none' };
  return { action: 'warn', warningDay: closest, daysLeft };
}
