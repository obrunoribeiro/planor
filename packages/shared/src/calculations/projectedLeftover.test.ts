import { describe, expect, it } from 'vitest';
import { projectedLeftover } from './projectedLeftover';

describe('projectedLeftover', () => {
  it('bate com o exemplo do CONTEXTO.md §12 (Bruno, outubro/2026)', () => {
    // renda 6.500,00 − gasto 3.910,10 − a vencer 1.341,00 = sobra 1.248,90
    const result = projectedLeftover({
      monthlyIncomeCents: 650_000,
      spentThisMonthCents: 391_010,
      dueUntilMonthEndCents: 134_100,
    });

    expect(result).toBe(124_890);
  });

  it('fica negativa quando o comprometido estoura a renda', () => {
    const result = projectedLeftover({
      monthlyIncomeCents: 300_000,
      spentThisMonthCents: 250_000,
      dueUntilMonthEndCents: 100_000,
    });

    expect(result).toBe(-50_000);
  });

  it('é zero quando não sobra nem falta nada', () => {
    const result = projectedLeftover({
      monthlyIncomeCents: 500_000,
      spentThisMonthCents: 400_000,
      dueUntilMonthEndCents: 100_000,
    });

    expect(result).toBe(0);
  });
});
