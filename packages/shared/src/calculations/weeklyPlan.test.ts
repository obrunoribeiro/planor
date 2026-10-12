import { describe, expect, it } from 'vitest';
import { buildWeeklyPlan, evaluateWeeklyPlan, weekRangeLabel, weekStartKey, type WeeklyPlanInput } from './weeklyPlan';

/** `formatCents` usa espaço não-separável depois de "R$" (Intl); nos testes compara com espaço comum. */
const plain = (text: string | undefined) => text?.replace(/\u00a0/g, ' ');

const base: WeeklyPlanInput = {
  todayKey: '2026-10-10', // sábado
  monthlyIncomeCents: 663_417,
  cardBills: [],
  categories: [],
  uncategorized: [],
  subscriptionsWithoutUsage: [],
};

describe('semana', () => {
  it('começa na segunda (domingo é o fim da semana anterior)', () => {
    expect(weekStartKey('2026-10-10')).toBe('2026-10-05');
    expect(weekStartKey('2026-10-05')).toBe('2026-10-05');
    expect(weekStartKey('2026-10-11')).toBe('2026-10-05');
  });

  it('rótulo como no Figma, inclusive virando o mês', () => {
    expect(weekRangeLabel('2026-10-05')).toBe('5 a 11 de outubro');
    expect(weekRangeLabel('2026-09-28')).toBe('28 de setembro a 4 de outubro');
  });
});

describe('buildWeeklyPlan', () => {
  it('sem renda, o primeiro item é informar a renda', () => {
    const [first] = buildWeeklyPlan({ ...base, monthlyIncomeCents: null });
    expect(first).toMatchObject({ type: 'income', actionRoute: '/perfil', completed: false });
  });

  it('fatura que vence nesta semana (caso real: Nubank R$ 6.466,23 em 18/10, plano da semana de 12/10)', () => {
    const [bill] = buildWeeklyPlan({
      ...base,
      todayKey: '2026-10-12',
      cardBills: [{ bank: 'Nubank', amountCents: 646_623, dueDateKey: '2026-10-18' }],
    });
    expect(bill).toMatchObject({ type: 'card_bill' });
    expect(plain(bill!.title)).toBe('Separar R$ 6.466,23 para a fatura');
    expect(bill!.description).toContain('18 de outubro');
  });

  it('fatura que vence depois do domingo não entra', () => {
    expect(buildWeeklyPlan({ ...base, cardBills: [{ bank: 'Nubank', amountCents: 646_623, dueDateKey: '2026-10-18' }] })).toEqual([]);
  });

  it('categoria variável acima do ritmo vira limite da semana; fixa, "Outros" e média pequena não', () => {
    const items = buildWeeklyPlan({
      ...base,
      categories: [
        // dia 10 de 31: o esperado é ~32% da média
        { categoryId: 'delivery', name: 'Delivery', kind: 'variable', monthToDateCents: 30_000, averageMonthlyCents: 41_000 },
        { categoryId: 'mercado', name: 'Mercado', kind: 'variable', monthToDateCents: 20_000, averageMonthlyCents: 80_000 },
        { categoryId: 'moradia', name: 'Moradia', kind: 'fixed', monthToDateCents: 145_000, averageMonthlyCents: 145_000 },
        { categoryId: 'outros', name: 'Outros', kind: 'variable', monthToDateCents: 90_000, averageMonthlyCents: 50_000 },
        { categoryId: 'cafe', name: 'Café', kind: 'variable', monthToDateCents: 9000, averageMonthlyCents: 5000 },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: 'category_limit',
      title: 'Segurar delivery até domingo',
      actionRoute: '/gastos/categoria/delivery',
      data: { limitCents: 9000 }, // 410 × 7/31 ≈ 92,58 → arredonda pra R$ 90
    });
  });

  it('compras sem categoria: as 10 maiores', () => {
    const uncategorized = Array.from({ length: 15 }, (_, i) => ({ id: `t${i}`, amountCents: (i + 1) * 100 }));
    const [categorize] = buildWeeklyPlan({ ...base, uncategorized });
    expect(categorize).toMatchObject({ type: 'categorize', title: 'Categorizar 10 compras sem categoria' });
    expect(categorize!.data.transactionIds).toEqual(['t14', 't13', 't12', 't11', 't10', 't9', 't8', 't7', 't6', 't5']);
  });

  it('assinaturas sem uso marcado (caso real: 6 assinaturas, R$ 135,31) e conclui quando todas forem marcadas', () => {
    const items = buildWeeklyPlan({
      ...base,
      subscriptionsWithoutUsage: [4090, 2490, 2151, 1990, 1457, 1353].map((amountCents) => ({ amountCents })),
    });
    expect(items[0]).toMatchObject({ type: 'subscription_usage', actionRoute: '/futuro/assinaturas' });
    expect(plain(items[0]!.description)).toBe('6 assinaturas somam R$ 135,31 por mês. As que você não usa entram nas sugestões de corte.');

    const live = { todayKey: '2026-10-10', incomeSet: true, weekSpentByCategory: {}, stillUncategorizedIds: [], cardBillsToPay: [] };
    expect(evaluateWeeklyPlan(items, { ...live, subscriptionsWithoutUsage: 2 })[0]!.completed).toBe(false);
    expect(evaluateWeeklyPlan(items, { ...live, subscriptionsWithoutUsage: 0 })[0]).toMatchObject({ completed: true, completedAutomatically: true });
  });

  it('no máximo 3 itens, na ordem de prioridade', () => {
    const items = buildWeeklyPlan({
      ...base,
      todayKey: '2026-10-12',
      monthlyIncomeCents: null,
      cardBills: [{ bank: 'Nubank', amountCents: 646_623, dueDateKey: '2026-10-18' }],
      categories: [{ categoryId: 'delivery', name: 'Delivery', kind: 'variable', monthToDateCents: 30_000, averageMonthlyCents: 41_000 }],
      uncategorized: [{ id: 't1', amountCents: 5000 }],
    });
    expect(items.map((i) => i.type)).toEqual(['income', 'card_bill', 'category_limit']);
  });
});

describe('evaluateWeeklyPlan', () => {
  const live = {
    todayKey: '2026-10-10',
    incomeSet: false,
    subscriptionsWithoutUsage: 1,
    weekSpentByCategory: {},
    stillUncategorizedIds: [] as string[],
    cardBillsToPay: [] as { bank: string; dueDateKey: string }[],
  };

  it('conclui sozinho a fatura quando ela sai da lista a pagar (o banco informou o pagamento)', () => {
    const [bill] = buildWeeklyPlan({ ...base, todayKey: '2026-10-12', cardBills: [{ bank: 'Nubank', amountCents: 646_623, dueDateKey: '2026-10-18' }] });
    const pending = [{ bank: 'Nubank', dueDateKey: '2026-10-18' }];
    expect(evaluateWeeklyPlan([bill!], { ...live, cardBillsToPay: pending })[0]!.completed).toBe(false);
    // Paga: o que fica a pagar é a fatura aberta, que vence no mês seguinte.
    const next = [{ bank: 'Nubank', dueDateKey: '2026-11-18' }];
    expect(evaluateWeeklyPlan([bill!], { ...live, cardBillsToPay: next })[0]).toMatchObject({ completed: true, completedAutomatically: true });
  });

  it('conclui sozinho a renda e a categorização; não desmarca o que o usuário marcou', () => {
    const [income, bill, categorize] = buildWeeklyPlan({
      ...base,
      todayKey: '2026-10-12',
      monthlyIncomeCents: null,
      cardBills: [{ bank: 'Nubank', amountCents: 646_623, dueDateKey: '2026-10-18' }],
      uncategorized: [{ id: 't1', amountCents: 5000 }, { id: 't2', amountCents: 3000 }],
    });

    const manualBill = { ...bill!, completed: true, completedAt: '2026-10-11' };
    const result = evaluateWeeklyPlan([income!, categorize!, manualBill], { ...live, incomeSet: true, stillUncategorizedIds: [] });

    expect(result[0]).toMatchObject({ completed: true, completedAutomatically: true, completedAt: '2026-10-10' });
    expect(result[1]).toMatchObject({ completed: true, completedAutomatically: true });
    expect(result[2]).toMatchObject({ completed: true, completedAt: '2026-10-11' });
  });

  it('mostra o quanto já foi gasto na categoria e quantas compras faltam categorizar', () => {
    const items = buildWeeklyPlan({
      ...base,
      categories: [{ categoryId: 'delivery', name: 'Delivery', kind: 'variable', monthToDateCents: 30_000, averageMonthlyCents: 41_000 }],
      uncategorized: [{ id: 't1', amountCents: 5000 }, { id: 't2', amountCents: 3000 }],
    });
    const [limit, categorize] = evaluateWeeklyPlan(items, { ...live, weekSpentByCategory: { delivery: 6290 }, stillUncategorizedIds: ['t2'] });

    expect(plain(limit!.description)).toBe('Limite sugerido: R$ 90,00 nesta semana. Você está em R$ 62,90.');
    expect(categorize!.description).toMatch(/^Faltam 1 de 2\./);
    expect(categorize!.completed).toBe(false);
  });
});
