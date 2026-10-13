import { describe, expect, it } from 'vitest';
import { billClosingDateKey, cardBillSummary, cardBillToPay, dayInMonthKey, nextDueDateKey, type CardBillEntry, type ClosedCardBill } from './creditCardBill';

const entry = (billMonth: string | null, amountCents: number, billId: string | null = null): CardBillEntry => ({ billMonth, billId, amountCents });

// Nubank real do Bruno: fecha dia 11, vence 18/19.
const setembro: ClosedCardBill = { month: '2026-09', totalCents: 696_776, paidCents: 696_776, dueDateKey: '2026-09-18' };
const outubroPaga: ClosedCardBill = { month: '2026-10', totalCents: 646_623, paidCents: 646_623, dueDateKey: '2026-10-19' };

describe('cardBillSummary', () => {
  it('bate com o Nubank do Bruno em 2026-10-10 (R$ 6.979,43 usado − R$ 513,20 futuro = R$ 6.466,23)', () => {
    const entries = [
      entry('2026-09', 690_000, 'fechada'),
      entry('2026-10', 505_616), // gastos da fatura aberta que o banco já mandou
      entry('2026-10', -696_776), // pagamento da fatura de setembro: não entra no detalhado
      entry('2026-11', 19_836),
      entry('2026-12', 19_836),
      entry('2027-01', 2_912),
      entry('2027-02', 2_912),
      entry('2027-03', 2_912),
      entry('2027-04', 2_912),
    ];

    expect(cardBillSummary({ usedLimitCents: 697_943, entries, lastClosed: setembro })).toEqual({
      openMonth: '2026-10',
      openBillCents: 646_623,
      undetailedCents: 141_007,
      closedUnpaidCents: 0,
    });
  });

  it('em 2026-10-12: fatura de outubro fechou e foi paga, mas os lançamentos dela ainda vêm sem billId', () => {
    const entries = [
      entry('2026-10', 505_616), // fechada, sem billId ainda
      entry('2026-11', -646_623), // pagamento da fatura de outubro, previsto pra novembro
      entry('2026-11', 19_836), // parcelas de novembro
      entry('2026-12', 19_836),
      entry('2027-01', 2_912),
      entry('2027-02', 2_912),
      entry('2027-03', 2_912),
      entry('2027-04', 2_912),
    ];

    expect(cardBillSummary({ usedLimitCents: 89_200, entries, lastClosed: outubroPaga })).toEqual({
      openMonth: '2026-11',
      openBillCents: 89_200 - 19_836 - 4 * 2_912,
      undetailedCents: 89_200 - 19_836 - 4 * 2_912 - 19_836,
      closedUnpaidCents: 0,
    });
  });

  it('fatura fechada ainda não paga sai do limite usado e não vira compra não detalhada', () => {
    const fechada: ClosedCardBill = { ...outubroPaga, paidCents: 0 };
    const entries = [entry('2026-10', 600_000), entry('2026-11', 30_000), entry('2026-12', 10_000)];

    expect(cardBillSummary({ usedLimitCents: 646_623 + 50_000 + 10_000, entries, lastClosed: fechada })).toEqual({
      openMonth: '2026-11',
      openBillCents: 50_000,
      undetailedCents: 20_000,
      closedUnpaidCents: 646_623,
    });
  });

  it('pagamento parcial: o resto da fechada continua no limite', () => {
    const parcial: ClosedCardBill = { ...outubroPaga, paidCents: 146_623 };
    expect(cardBillSummary({ usedLimitCents: 520_000, entries: [entry('2026-11', 20_000)], lastClosed: parcial }).closedUnpaidCents).toBe(500_000);
  });

  it('sem fatura fechada conhecida: usa o billId e não estima compras não detalhadas', () => {
    const entries = [entry('2026-09', 120_000, 'fechada'), entry('2026-10', 50_000), entry('2026-11', 30_000), entry('2026-11', -10_000)];
    expect(cardBillSummary({ usedLimitCents: 100_000, entries, lastClosed: null })).toEqual({
      openMonth: '2026-10',
      openBillCents: 80_000,
      undetailedCents: 0,
      closedUnpaidCents: 0,
    });
  });

  it('sem nenhum lançamento: a fatura aberta é o limite usado inteiro', () => {
    expect(cardBillSummary({ usedLimitCents: 120_000, entries: [entry('2026-09', 120_000, 'fechada')], lastClosed: null })).toMatchObject({
      openMonth: null,
      openBillCents: 120_000,
    });
  });

  it('logo depois do fechamento (nada detalhado na aberta) não estima compras não detalhadas; nunca fica negativo', () => {
    expect(cardBillSummary({ usedLimitCents: 40_000, entries: [entry('2026-12', 10_000)], lastClosed: outubroPaga })).toMatchObject({
      openBillCents: 30_000,
      undetailedCents: 0,
    });
    expect(cardBillSummary({ usedLimitCents: 10_000, entries: [entry(null, -500_000), entry('2026-12', 20_000)], lastClosed: outubroPaga }).openBillCents).toBe(0);
  });
});

describe('cardBillToPay', () => {
  it('a fechada enquanto falta pagar, mesmo atrasada', () => {
    const fechada: ClosedCardBill = { ...outubroPaga, paidCents: 0 };
    const summary = cardBillSummary({ usedLimitCents: 700_000, entries: [], lastClosed: fechada });
    expect(cardBillToPay({ lastClosed: fechada, summary, dueDay: 19, todayKey: '2026-10-22' })).toEqual({
      kind: 'closed',
      month: '2026-10',
      amountCents: 646_623,
      dueDateKey: '2026-10-19',
    });
  });

  it('depois de paga, a aberta com vencimento no mês dela', () => {
    const summary = cardBillSummary({ usedLimitCents: 89_200, entries: [entry('2026-11', 19_836)], lastClosed: outubroPaga });
    expect(cardBillToPay({ lastClosed: outubroPaga, summary, dueDay: 19, todayKey: '2026-10-12' })).toEqual({
      kind: 'open',
      month: '2026-11',
      amountCents: 89_200,
      dueDateKey: '2026-11-19',
    });
  });

  it('sem mês da fatura aberta, usa o próximo vencimento', () => {
    const summary = cardBillSummary({ usedLimitCents: 5_000, entries: [], lastClosed: null });
    expect(cardBillToPay({ lastClosed: null, summary, dueDay: 10, todayKey: '2026-10-12' }).dueDateKey).toBe('2026-11-10');
  });
});

describe('datas da fatura', () => {
  it('dayInMonthKey ajusta dia inexistente', () => {
    expect(dayInMonthKey('2026-11', 31)).toBe('2026-11-30');
    expect(dayInMonthKey('2027-02', 30)).toBe('2027-02-28');
  });

  it('billClosingDateKey: mesmo mês quando fecha antes de vencer, senão mês anterior', () => {
    expect(billClosingDateKey('2026-11', 11, 19)).toBe('2026-11-11');
    expect(billClosingDateKey('2026-11', 28, 5)).toBe('2026-10-28');
    expect(billClosingDateKey('2027-01', 28, 5)).toBe('2026-12-28');
  });

  it('nextDueDateKey: ainda este mês (inclusive hoje), ou o próximo', () => {
    expect(nextDueDateKey(18, '2026-10-10')).toBe('2026-10-18');
    expect(nextDueDateKey(10, '2026-10-10')).toBe('2026-10-10');
    expect(nextDueDateKey(5, '2026-10-10')).toBe('2026-11-05');
    expect(nextDueDateKey(5, '2026-12-20')).toBe('2027-01-05');
    expect(nextDueDateKey(31, '2026-11-02')).toBe('2026-11-30');
  });
});
