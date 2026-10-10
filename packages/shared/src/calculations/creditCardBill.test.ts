import { describe, expect, it } from 'vitest';
import { currentBillCents, type CardBillEntry } from './creditCardBill';

const entry = (billMonth: string | null, amountCents: number, billId: string | null = null): CardBillEntry => ({ billMonth, billId, amountCents });

describe('currentBillCents', () => {
  it('bate com a fatura real do Nubank do Bruno em 2026-10-10 (R$ 6.979,43 usado − R$ 513,20 futuro)', () => {
    const entries = [
      // fatura fechada (já tem billId) — não entra na conta
      entry('2026-09', 690_000, 'fechada'),
      // fatura aberta de outubro (parcial: o banco ainda não entregou todas as compras)
      entry('2026-10', 505_616),
      // parcelas já lançadas pras próximas faturas
      entry('2026-11', 19_836),
      entry('2026-12', 19_836),
      entry('2027-01', 2_912),
      entry('2027-02', 2_912),
      entry('2027-03', 2_912),
      entry('2027-04', 2_912),
    ];

    expect(currentBillCents(697_943, entries)).toBe(646_623);
  });

  it('sem lançamento em fatura aberta, a fatura é o limite usado inteiro', () => {
    expect(currentBillCents(120_000, [entry('2026-09', 120_000, 'fechada')])).toBe(120_000);
  });

  it('estorno numa fatura futura diminui o futuro (e aumenta a fatura atual)', () => {
    expect(currentBillCents(100_000, [entry('2026-10', 50_000), entry('2026-11', 30_000), entry('2026-11', -10_000)])).toBe(80_000);
  });

  it('ignora lançamento sem mês previsto e nunca fica negativo', () => {
    expect(currentBillCents(10_000, [entry(null, -500_000), entry('2026-10', 5_000), entry('2026-11', 20_000)])).toBe(0);
  });
});
