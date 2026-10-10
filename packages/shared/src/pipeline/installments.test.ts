import { describe, expect, it } from 'vitest';
import { projectCommittedByMonth } from '../calculations/committedByMonth';
import { addMonthsToKey, detectInstallmentPlans, monthsBetweenKeys, parseInstallmentSuffix, type InstallmentTransaction } from './installments';

describe('parseInstallmentSuffix', () => {
  it.each([
    ['Cold City Importacao e 2/3', { number: 2, count: 3 }],
    ['SUPERMERCADO BOM PRECO PARC 03/10', { number: 3, count: 10 }],
    ['LOJA X PARCELA 3 DE 10', { number: 3, count: 10 }],
    ['BEE**PagTesouro 12/12', { number: 12, count: 12 }],
  ])('%s', (description, expected) => {
    expect(parseInstallmentSuffix(description)).toEqual(expected);
  });

  it.each(['Padaria do Zé', 'Compra 1/1', 'Loja 5/3', 'Uber 0/2'])('%s não é parcela', (description) => {
    expect(parseInstallmentSuffix(description)).toBeNull();
  });
});

describe('meses', () => {
  it('soma e conta meses atravessando o ano', () => {
    expect(addMonthsToKey('2026-11', 3)).toBe('2027-02');
    expect(addMonthsToKey('2026-01', -1)).toBe('2025-12');
    expect(monthsBetweenKeys('2026-10', '2027-04')).toBe(6);
  });
});

let seq = 0;
const tx = (partial: Partial<InstallmentTransaction>): InstallmentTransaction => ({
  id: `t${++seq}`,
  accountId: 'cartao',
  descriptionRaw: 'Loja',
  merchantName: null,
  postedAt: new Date('2026-10-05T15:00:00Z'),
  amountCents: -1000,
  installmentNumber: null,
  installmentCount: null,
  billMonth: null,
  ...partial,
});

describe('detectInstallmentPlans', () => {
  it('usa número, total e mês da fatura do agregador (caso real: PagTesouro 12x de R$ 29,12)', () => {
    const parcelas = Array.from({ length: 12 }, (_, i) =>
      tx({
        descriptionRaw: `BEE**PagTesouro ${i + 1}/12`,
        amountCents: -2912,
        installmentNumber: i + 1,
        installmentCount: 12,
        billMonth: addMonthsToKey('2026-05', i),
      }),
    );

    const [plan] = detectInstallmentPlans(parcelas, '2026-10');

    expect(plan).toMatchObject({
      merchantName: 'PagTesouro',
      installmentCents: 2912,
      totalCents: 34_944,
      count: 12,
      current: 6,
      firstMonth: '2026-05',
      lastMonth: '2027-04',
    });
    expect(plan!.transactionIds).toHaveLength(12);
  });

  it('sem dado do agregador, lê o sufixo e projeta as parcelas que ainda não chegaram', () => {
    const plans = detectInstallmentPlans([tx({ descriptionRaw: 'CELULAR PARC 03/10', amountCents: -24_000, postedAt: new Date('2026-10-03T12:00:00Z') })], '2026-10');

    expect(plans).toEqual([
      expect.objectContaining({ merchantName: 'Celular', count: 10, current: 3, firstMonth: '2026-08', lastMonth: '2027-05', totalCents: 240_000 }),
    ]);
  });

  it('separa duas compras iguais feitas em meses diferentes', () => {
    const plans = detectInstallmentPlans(
      [
        tx({ descriptionRaw: 'Shopee 2/3', billMonth: '2026-10' }), // compra de setembro
        tx({ descriptionRaw: 'Shopee 1/3', billMonth: '2026-10' }), // compra de outubro
      ],
      '2026-10',
    );
    expect(plans.map((p) => p.firstMonth).sort()).toEqual(['2026-09', '2026-10']);
  });

  it('junta parcelas da mesma compra mesmo com 1 centavo de diferença (caso real: Cold City 3x)', () => {
    const plans = detectInstallmentPlans(
      [
        tx({ descriptionRaw: 'Cold City Importacao e 1/3', amountCents: -16_334, installmentNumber: 1, installmentCount: 3, billMonth: '2026-08' }),
        tx({ descriptionRaw: 'Cold City Importacao e 2/3', amountCents: -16_333, installmentNumber: 2, installmentCount: 3, billMonth: '2026-09' }),
        tx({ descriptionRaw: 'Cold City Importacao e 3/3', amountCents: -16_333, installmentNumber: 3, installmentCount: 3, billMonth: '2026-10' }),
      ],
      '2026-10',
    );

    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ installmentCents: 16_333, totalCents: 49_000, amountByMonth: { '2026-08': 16_334, '2026-10': 16_333 } });
  });

  it('ignora parcelamento já terminado, estorno e compra à vista', () => {
    const plans = detectInstallmentPlans(
      [
        tx({ descriptionRaw: 'Geladeira 6/6', billMonth: '2026-09' }),
        tx({ descriptionRaw: 'Estorno Loja 2/3', amountCents: 1000 }),
        tx({ descriptionRaw: 'Padaria' }),
      ],
      '2026-10',
    );
    expect(plans).toEqual([]);
  });

  it('a última parcela no mês de referência ainda conta', () => {
    const [plan] = detectInstallmentPlans([tx({ descriptionRaw: 'Sephora 6/6', billMonth: '2026-10' })], '2026-10');
    expect(plan).toMatchObject({ current: 6, lastMonth: '2026-10' });
  });
});

describe('projectCommittedByMonth', () => {
  it('soma parcelas e recorrências a partir do mês seguinte e corta o fim vazio', () => {
    const months = projectCommittedByMonth({
      referenceMonth: '2026-10',
      horizon: 6,
      installments: [
        { installmentCents: 2912, firstMonth: '2026-05', lastMonth: '2027-04' },
        { installmentCents: 4623, firstMonth: '2026-01', lastMonth: '2026-12', amountByMonth: { '2026-12': 4625 } },
        { installmentCents: 9999, firstMonth: '2025-11', lastMonth: '2026-10' }, // termina no mês atual
      ],
      recurrences: [],
    });

    expect(months).toEqual([
      { month: '2026-11', installmentsCents: 7535, subscriptionsCents: 0, billsCents: 0 },
      { month: '2026-12', installmentsCents: 7537, subscriptionsCents: 0, billsCents: 0 }, // valor real da parcela
      { month: '2027-01', installmentsCents: 2912, subscriptionsCents: 0, billsCents: 0 },
      { month: '2027-02', installmentsCents: 2912, subscriptionsCents: 0, billsCents: 0 },
      { month: '2027-03', installmentsCents: 2912, subscriptionsCents: 0, billsCents: 0 },
      { month: '2027-04', installmentsCents: 2912, subscriptionsCents: 0, billsCents: 0 },
    ]);
  });

  it('recorrência mensal sem data cai todo mês; com data, segue o intervalo', () => {
    const months = projectCommittedByMonth({
      referenceMonth: '2026-10',
      horizon: 3,
      installments: [],
      recurrences: [
        { kind: 'subscription', amountCents: 3990, cadenceDays: 30, nextChargeAt: null },
        { kind: 'recurring_bill', amountCents: 65_000, cadenceDays: 30, nextChargeAt: null },
        { kind: 'subscription', amountCents: 12_000, cadenceDays: 365, nextChargeAt: new Date('2026-12-15T12:00:00Z') }, // anual
        { kind: 'subscription', amountCents: 5000, cadenceDays: 365, nextChargeAt: null }, // anual sem data: não dá pra saber o mês
      ],
    });

    expect(months.map((m) => [m.month, m.subscriptionsCents, m.billsCents])).toEqual([
      ['2026-11', 3990, 65_000],
      ['2026-12', 15_990, 65_000],
      ['2027-01', 3990, 65_000],
    ]);
  });
});
