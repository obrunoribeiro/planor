import { describe, expect, it } from 'vitest';
import { categoriesAheadOfPace, describeAlert, unusualPurchases } from './alerts';

const plain = (text: string) => text.replace(/\u00a0/g, ' ');

describe('unusualPurchases', () => {
  const history = [
    { categoryId: 'mercado', amountCents: 10_000 },
    { categoryId: 'mercado', amountCents: 12_000 },
    { categoryId: 'mercado', amountCents: 14_000 },
    { categoryId: 'delivery', amountCents: 500 },
    { categoryId: 'delivery', amountCents: 700 },
    { categoryId: 'delivery', amountCents: 900 },
    { categoryId: 'lazer', amountCents: 5_000 },
  ];

  it('sinaliza compra acima de 1,5× a média por compra da categoria', () => {
    const result = unusualPurchases({
      candidates: [
        { id: 'a', categoryId: 'mercado', amountCents: 24_785 }, // média 120 → 247,85 > 180
        { id: 'b', categoryId: 'mercado', amountCents: 17_000 }, // 170 < 180
      ],
      history,
    });
    expect(result).toEqual([
      { id: 'a', categoryId: 'mercado', amountCents: 24_785, averageCents: 12_000 },
    ]);
  });

  it('uma por categoria: a maior', () => {
    const result = unusualPurchases({
      candidates: [
        { id: 'x', categoryId: 'mercado', amountCents: 20_000 },
        { id: 'y', categoryId: 'mercado', amountCents: 30_000 },
      ],
      history,
    });
    expect(result.map((r) => r.id)).toEqual(['y']);
  });

  it('ignora compra pequena e categoria com pouco histórico', () => {
    const result = unusualPurchases({
      candidates: [
        { id: 'c', categoryId: 'delivery', amountCents: 2_000 }, // > 1,5×7, mas < R$ 30
        { id: 'd', categoryId: 'lazer', amountCents: 50_000 }, // só 1 compra de histórico
        { id: 'e', categoryId: 'saude', amountCents: 50_000 }, // sem histórico
      ],
      history,
    });
    expect(result).toEqual([]);
  });
});

describe('categoriesAheadOfPace', () => {
  const categories = [
    {
      categoryId: 'delivery',
      name: 'Delivery',
      kind: 'variable' as const,
      monthToDateCents: 35_000,
      averageMonthlyCents: 40_000,
    },
    {
      categoryId: 'mercado',
      name: 'Mercado',
      kind: 'variable' as const,
      monthToDateCents: 20_000,
      averageMonthlyCents: 60_000,
    },
    {
      categoryId: 'moradia',
      name: 'Moradia',
      kind: 'fixed' as const,
      monthToDateCents: 200_000,
      averageMonthlyCents: 200_000,
    },
    {
      categoryId: 'novo',
      name: 'Novo',
      kind: 'variable' as const,
      monthToDateCents: 5_000,
      averageMonthlyCents: null,
    },
    // Uma parcela só já passa dos 80% de uma média tão pequena.
    {
      categoryId: 'educacao',
      name: 'Educação',
      kind: 'variable' as const,
      monthToDateCents: 4_623,
      averageMonthlyCents: 4_623,
    },
  ];

  it('variável acima de 80% do habitual antes do dia 20', () => {
    expect(categoriesAheadOfPace({ dayOfMonth: 12, categories }).map((c) => c.categoryId)).toEqual([
      'delivery',
    ]);
  });

  it('do dia 20 em diante não alerta', () => {
    expect(categoriesAheadOfPace({ dayOfMonth: 20, categories })).toEqual([]);
  });
});

describe('describeAlert', () => {
  it('gasto fora do padrão leva à transação', () => {
    const view = describeAlert('unusual_spend', {
      transactionId: 't1',
      merchantName: 'Supermercado Bom Preço',
      amountCents: 24_785,
      categoryName: 'Mercado',
    });
    expect(view).toMatchObject({
      title: 'Gasto fora do padrão',
      route: '/gastos/transacao/t1',
      important: true,
    });
    expect(plain(view.body)).toBe(
      'R$ 247,85 em Supermercado Bom Preço, acima do que você costuma gastar por compra em Mercado.',
    );
  });

  it('fatura fechando, com e sem parcelas', () => {
    const view = describeAlert('statement_closing', {
      accountId: 'c1',
      bank: 'Nubank',
      daysLeft: 3,
      totalCents: 148_260,
      installmentsCents: 53_000,
    });
    expect(view.title).toBe('Fatura do Nubank fecha em 3 dias');
    expect(plain(view.body)).toBe('Previsão de R$ 1.482,60, com R$ 530,00 em parcelas.');
    expect(
      describeAlert('statement_closing', { bank: 'Nubank', daysLeft: 1, totalCents: 100 }).title,
    ).toBe('Fatura do Nubank fecha amanhã');
  });

  it('tipo desconhecido não quebra', () => {
    expect(describeAlert('algo_novo', {})).toMatchObject({ title: 'Aviso', route: null });
  });
});
