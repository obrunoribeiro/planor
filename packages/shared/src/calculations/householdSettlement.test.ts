import { describe, expect, it } from 'vitest';
import { householdBalances, settleBalances } from './householdSettlement';

describe('householdBalances', () => {
  it('bate com o exemplo do CONTEXTO.md §12 (Bruno e Ana, divisão 54/46)', () => {
    const balances = householdBalances(312_000, [
      { userId: 'bruno', sharePct: 0.54, paidCents: 247_505 },
      { userId: 'ana', sharePct: 0.46, paidCents: 64_495 },
    ]);

    const bruno = balances.find((b) => b.userId === 'bruno')!;
    const ana = balances.find((b) => b.userId === 'ana')!;

    expect(bruno.shareCents).toBe(168_480);
    expect(bruno.balanceCents).toBe(79_025); // +790,25 — Ana deve isso a ele
    expect(ana.shareCents).toBe(143_520);
    expect(ana.balanceCents).toBe(-79_025); // -790,25 — Ana deve
  });
});

describe('settleBalances', () => {
  it('gera uma transferência única entre 2 pessoas (caso do CONTEXTO.md §12)', () => {
    const settlements = settleBalances([
      { userId: 'bruno', shareCents: 168_480, balanceCents: 79_025 },
      { userId: 'ana', shareCents: 143_520, balanceCents: -79_025 },
    ]);

    expect(settlements).toEqual([{ fromUserId: 'ana', toUserId: 'bruno', amountCents: 79_025 }]);
  });

  it('minimiza o número de transferências com mais de 2 pessoas', () => {
    // A deve 100, B deve 50, C tem 150 a receber → só 2 transferências, não 3.
    const settlements = settleBalances([
      { userId: 'a', shareCents: 0, balanceCents: -100 },
      { userId: 'b', shareCents: 0, balanceCents: -50 },
      { userId: 'c', shareCents: 0, balanceCents: 150 },
    ]);

    expect(settlements).toHaveLength(2);
    const total = settlements.reduce((sum, s) => sum + s.amountCents, 0);
    expect(total).toBe(150);
  });

  it('não gera transferências quando todo mundo está quite', () => {
    const settlements = settleBalances([
      { userId: 'a', shareCents: 100, balanceCents: 0 },
      { userId: 'b', shareCents: 100, balanceCents: 0 },
    ]);

    expect(settlements).toEqual([]);
  });
});
