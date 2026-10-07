// Divisão da casa e acertos — CONTEXTO.md §6.11.
//
//   para cada pessoa p:
//     parte(p)  = total_da_casa × percentual(p)
//     pagou(p)  = soma das despesas da casa pagas por p
//     saldo(p)  = pagou(p) − parte(p)
//   quem tem saldo negativo deve; quem tem saldo positivo recebe
//   (com mais de 2 pessoas, minimizar o número de transferências)
//
// O Planor nunca move dinheiro (CLAUDE.md, princípio 1) — isto só calcula quem deve
// quanto a quem; o "Mandar cobrança" e o "Registrar acerto" ficam na camada de API/UI.

import type { AmountCents } from '../money';

export type HouseholdMember = {
  userId: string;
  /** Percentual da divisão, de 0 a 1 (ex.: 0.54 para 54%). A soma de todos os membros deve ser 1. */
  sharePct: number;
  /** Soma do que essa pessoa pagou em despesas da casa no período. */
  paidCents: AmountCents;
};

export type HouseholdBalance = {
  userId: string;
  shareCents: AmountCents;
  /** paidCents − shareCents. Positivo = a pessoa pagou a mais (tem a receber). */
  balanceCents: AmountCents;
};

export type Settlement = {
  fromUserId: string;
  toUserId: string;
  amountCents: AmountCents;
};

export function householdBalances(
  totalCents: AmountCents,
  members: HouseholdMember[],
): HouseholdBalance[] {
  return members.map((member) => {
    const shareCents = Math.round(totalCents * member.sharePct);
    return {
      userId: member.userId,
      shareCents,
      balanceCents: member.paidCents - shareCents,
    };
  });
}

/**
 * Transforma saldos em uma lista de transferências (quem deve pagar quanto a quem),
 * minimizando o número de transferências necessárias — útil quando a casa tem mais de 2 pessoas.
 */
export function settleBalances(balances: HouseholdBalance[]): Settlement[] {
  const debtors = balances
    .filter((b) => b.balanceCents < 0)
    .map((b) => ({ userId: b.userId, remainingCents: -b.balanceCents }))
    .sort((a, b) => b.remainingCents - a.remainingCents);

  const creditors = balances
    .filter((b) => b.balanceCents > 0)
    .map((b) => ({ userId: b.userId, remainingCents: b.balanceCents }))
    .sort((a, b) => b.remainingCents - a.remainingCents);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]!;
    const creditor = creditors[j]!;
    const amountCents = Math.min(debtor.remainingCents, creditor.remainingCents);

    if (amountCents > 0) {
      settlements.push({ fromUserId: debtor.userId, toUserId: creditor.userId, amountCents });
      debtor.remainingCents -= amountCents;
      creditor.remainingCents -= amountCents;
    }

    if (debtor.remainingCents === 0) i++;
    if (creditor.remainingCents === 0) j++;
  }

  return settlements;
}
