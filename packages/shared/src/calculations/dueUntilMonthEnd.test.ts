import { describe, expect, it } from 'vitest';
import { dueUntilMonthEnd } from './dueUntilMonthEnd';

// 10/10/2026, 15h em São Paulo.
const NOW = new Date('2026-10-10T18:00:00Z');

describe('dueUntilMonthEnd', () => {
  it('bate com a conta real do Bruno em 10/10/2026', () => {
    const result = dueUntilMonthEnd({
      now: NOW,
      transactions: [
        { postedAt: new Date('2026-10-12T03:00:00Z'), amountCents: -2912, isInstallment: true }, // PagTesouro 7/12
        { postedAt: new Date('2026-10-13T03:00:00Z'), amountCents: -4391, isInstallment: true }, // Shopee 5/6
        { postedAt: new Date('2026-10-05T03:00:00Z'), amountCents: -9999, isInstallment: true }, // já passou: é gasto do mês
        { postedAt: new Date('2026-11-12T03:00:00Z'), amountCents: -2912, isInstallment: true }, // mês que vem: é comprometido
      ],
      recurrences: [
        { kind: 'subscription', amountCents: 4090, nextChargeAt: new Date('2026-10-13T17:13:00Z') }, // Spotify
        { kind: 'subscription', amountCents: 2490, nextChargeAt: new Date('2026-10-14T13:48:00Z') }, // Crunchyroll
        { kind: 'subscription', amountCents: 2151, nextChargeAt: new Date('2026-10-12T18:11:00Z') }, // Claude
        { kind: 'subscription', amountCents: 1457, nextChargeAt: new Date('2026-10-28T20:57:00Z') }, // Adoreshare
        { kind: 'subscription', amountCents: 1353, nextChargeAt: new Date('2026-10-26T03:55:00Z') }, // Framer
        { kind: 'subscription', amountCents: 1990, nextChargeAt: new Date('2026-09-27T21:32:00Z') }, // Melimais, 13 dias atrasada
        { kind: 'recurring_bill', amountCents: 8580, nextChargeAt: new Date('2026-11-03T20:18:00Z') }, // Vivo, mês que vem
      ],
    });

    expect(result).toEqual({ installmentsCents: 7303, subscriptionsCents: 11_541, billsCents: 0, otherCents: 0, totalCents: 18_844 });
  });

  it('cobrança atrasada até 5 dias ainda conta', () => {
    const result = dueUntilMonthEnd({
      now: NOW,
      transactions: [],
      recurrences: [{ kind: 'recurring_bill', amountCents: 65_000, nextChargeAt: new Date('2026-10-07T12:00:00Z') }],
    });
    expect(result.billsCents).toBe(65_000);
  });

  it('último dia do mês ainda é deste mês no fuso de São Paulo', () => {
    const result = dueUntilMonthEnd({
      now: NOW,
      transactions: [
        { postedAt: new Date('2026-11-01T02:59:00Z'), amountCents: -1000, isInstallment: false }, // 31/10, 23h59 em SP
        { postedAt: new Date('2026-11-01T03:00:00Z'), amountCents: -1000, isInstallment: false }, // 01/11 em SP
        { postedAt: new Date('2026-10-20T12:00:00Z'), amountCents: 5000, isInstallment: false }, // entrada não é a vencer
      ],
      recurrences: [],
    });
    expect(result).toMatchObject({ otherCents: 1000, totalCents: 1000 });
  });
});
