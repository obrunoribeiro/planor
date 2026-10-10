import { describe, expect, it } from 'vitest';
import { categorizeTransaction, isCardBillPayment } from './categorize';
import { buildMonthlySummaries, lastMonthKeys, monthKeySaoPaulo, monthlyAverageCents, previousMonthKey, trendVsPreviousPct } from './monthlySummary';
import { normalizeForMatch, normalizeMerchantName } from './normalize';

describe('normalizeMerchantName', () => {
  it.each([
    ['Ebn *Tiktok', 'Tiktok'],
    ['Mp *Pitstop', 'Pitstop'],
    ['BEE**PagTesouro 12/12', 'PagTesouro'],
    ['Ifd*47139681 Joao Carl', 'Joao Carl'],
    ['Jim.Com* 64248102 Gab', 'Gab'],
    ['Cold City Importacao e 2/3', 'Cold City Importacao e'],
    ['IFOOD *PIZZARIA BELLA', 'Pizzaria Bella'],
    ['SUPERMERCADO BOM PRECO PARC 03/10', 'Supermercado Bom Preco'],
    ['Transferência enviada pelo Pix|FOGGO ENTERTAINMENT LTDA.', 'Foggo Entertainment Ltda.'],
    ['Conta Vivo', 'Conta Vivo'],
    ['iFood', 'iFood'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizeMerchantName(raw)).toBe(expected);
  });

  it('nunca devolve vazio', () => {
    expect(normalizeMerchantName('3/10')).toBe('3/10');
  });
});

describe('normalizeForMatch', () => {
  it('tira acento, caixa e pontuação', () => {
    expect(normalizeForMatch('Farmácia  São-João*')).toBe('farmacia sao joao');
  });
});

describe('categorizeTransaction', () => {
  const tx = (descriptionRaw: string, amountCents = -1000, merchantName: string | null = null) => ({
    descriptionRaw,
    merchantName,
    amountCents,
  });

  it.each([
    ['IFOOD *PIZZARIA BELLA', 'Delivery'],
    ['Ifd*47139681 Joao Carl', 'Delivery'],
    ['UBER *EATS', 'Delivery'],
    ['UBER *TRIP', 'Transporte'],
    ['Posto Trevo', 'Transporte'],
    ['Supermercado Economico', 'Mercado'],
    ['MERCADOLIVRE*VENDEDOR', 'Compras'],
    ['Mercado Livre', 'Compras'],
    ['Apple.Com/Bill', 'Assinaturas'],
    ['AMAZON PRIME CANAL', 'Assinaturas'],
    ['AMAZON MARKETPLACE', 'Compras'],
    ['FARMACIA DROGASIL', 'Saúde'],
    ['ENEL ENERGIA', 'Contas da casa'],
    ['Conta Vivo', 'Contas da casa'],
    ['ALUGUEL IMOBILIARIA', 'Moradia'],
    ['KIWIFY*Prospect 12/12', 'Educação'],
    ['Mp *Veloxingressos', 'Lazer'],
    ['Applecombill', 'Assinaturas'],
    ['Htm*Orbyka Cursos e Tr', 'Educação'],
    ['Ub - Campo Real Educacional S.a.', 'Educação'],
  ])('%s → %s', (description, category) => {
    expect(categorizeTransaction(tx(description), [])).toEqual({ source: 'global_rule', categoryName: category, expenseKind: null });
  });

  it('não casa pedaço de palavra ("mercado" em "mercadopago")', () => {
    expect(categorizeTransaction(tx('MERCADOPAGO*LOJA XYZ'), [])).toBeNull();
  });

  it('deixa sem categoria o que é ambíguo', () => {
    expect(categorizeTransaction(tx('Ebn *Tiktok'), [])).toBeNull();
  });

  it('não aplica dicionário global em entrada', () => {
    expect(categorizeTransaction(tx('Estorno Shopee', 5000), [])).toBeNull();
  });

  it('regra do usuário vence a global', () => {
    const rules = [{ matchType: 'merchant' as const, pattern: 'Pitstop', categoryId: 'cat-lazer', expenseKind: null }];
    expect(categorizeTransaction(tx('Mp *Pitstop', -7000, 'Pitstop'), rules)).toEqual({
      source: 'user_rule',
      categoryId: 'cat-lazer',
      expenseKind: null,
    });
  });

  it('regra por comerciante compara sem caixa nem acento, e não casa parcial', () => {
    const rules = [{ matchType: 'merchant' as const, pattern: 'TIKTOK', categoryId: 'cat-compras', expenseKind: 'variable' as const }];
    expect(categorizeTransaction(tx('Ebn *Tiktok', -1000, 'Tiktok'), rules)?.categoryId).toBe('cat-compras');
    expect(categorizeTransaction(tx('Tiktok Shop', -1000, 'Tiktok Shop'), rules)).toBeNull();
  });

  it('regra por palavra-chave casa em qualquer ponto da descrição', () => {
    const rules = [{ matchType: 'keyword' as const, pattern: 'tiktok', categoryId: 'cat-compras', expenseKind: null }];
    expect(categorizeTransaction(tx('Demerge Bras*Tiktok', -1000, 'Tiktok'), rules)?.categoryId).toBe('cat-compras');
  });
});

describe('isCardBillPayment', () => {
  it('pega os dois lados do pagamento da fatura', () => {
    expect(isCardBillPayment({ descriptionRaw: 'Pagamento de fatura', accountType: 'checking' })).toBe(true);
    expect(isCardBillPayment({ descriptionRaw: 'Pagamento recebido', accountType: 'credit_card' })).toBe(true);
  });

  it('saldo levado pra fatura seguinte não conta de novo, mas juros sim', () => {
    expect(isCardBillPayment({ descriptionRaw: 'Saldo em atraso', accountType: 'credit_card' })).toBe(true);
    expect(isCardBillPayment({ descriptionRaw: 'Saldo em rotativo', accountType: 'credit_card' })).toBe(true);
    expect(isCardBillPayment({ descriptionRaw: 'Juros de atraso', accountType: 'credit_card' })).toBe(false);
  });

  it('"Pagamento recebido" na conta corrente é renda, não fatura', () => {
    expect(isCardBillPayment({ descriptionRaw: 'Pagamento recebido', accountType: 'checking' })).toBe(false);
  });

  it('compra comum não é pagamento de fatura', () => {
    expect(isCardBillPayment({ descriptionRaw: 'Supermercado', accountType: 'credit_card' })).toBe(false);
  });
});

describe('buildMonthlySummaries', () => {
  const categories = [
    { id: 'moradia', defaultKind: 'fixed' as const, includeInAnalysis: true },
    { id: 'mercado', defaultKind: 'variable' as const, includeInAnalysis: true },
    { id: 'outros', defaultKind: 'variable' as const, includeInAnalysis: true },
    { id: 'invest', defaultKind: 'variable' as const, includeInAnalysis: false },
  ];
  const base = { categoryId: null, expenseKind: null, isHidden: false, isTransfer: false };

  it('agrega gasto, renda, categoria e fixo/variável por mês em America/Sao_Paulo', () => {
    const result = buildMonthlySummaries(
      [
        { ...base, postedAt: new Date('2026-10-05T12:00:00Z'), amountCents: 650_000 },
        { ...base, postedAt: new Date('2026-10-01T12:00:00Z'), amountCents: -145_000, categoryId: 'moradia' },
        { ...base, postedAt: new Date('2026-10-03T12:00:00Z'), amountCents: -81_240, categoryId: 'mercado' },
        // Mercado marcado como fixo pelo usuário — o expenseKind da transação vence o da categoria.
        { ...base, postedAt: new Date('2026-10-04T12:00:00Z'), amountCents: -10_000, categoryId: 'mercado', expenseKind: 'fixed' },
        { ...base, postedAt: new Date('2026-10-06T12:00:00Z'), amountCents: -2_000 }, // sem categoria → outros
      ],
      categories,
      'outros',
    );
    expect(result).toEqual([
      {
        month: '2026-10',
        incomeCents: 650_000,
        spentCents: 238_240,
        byCategory: { moradia: 145_000, mercado: 91_240, outros: 2_000 },
        fixedCents: 155_000,
        variableCents: 83_240,
      },
    ]);
  });

  it('ignora ocultas, transferências e categorias fora da análise', () => {
    const result = buildMonthlySummaries(
      [
        { ...base, postedAt: new Date('2026-10-05T12:00:00Z'), amountCents: -1_000, isHidden: true },
        { ...base, postedAt: new Date('2026-10-05T12:00:00Z'), amountCents: -1_253_606, isTransfer: true },
        { ...base, postedAt: new Date('2026-10-05T12:00:00Z'), amountCents: 1_253_606, isTransfer: true },
        { ...base, postedAt: new Date('2026-10-05T12:00:00Z'), amountCents: -50_000, categoryId: 'invest' },
        { ...base, postedAt: new Date('2026-10-05T12:00:00Z'), amountCents: -500, categoryId: 'mercado' },
      ],
      categories,
      'outros',
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ spentCents: 500, incomeCents: 0, byCategory: { mercado: 500 } });
  });

  it('compra às 23h de 31/10 em Brasília conta em outubro, não novembro', () => {
    const result = buildMonthlySummaries(
      [{ ...base, postedAt: new Date('2026-11-01T02:00:00Z'), amountCents: -100 }],
      categories,
      'outros',
    );
    expect(result.map((r) => r.month)).toEqual(['2026-10']);
  });
});

describe('helpers de mês', () => {
  it('monthKeySaoPaulo usa o fuso de Brasília', () => {
    expect(monthKeySaoPaulo(new Date('2026-10-01T02:59:00Z'))).toBe('2026-09');
    expect(monthKeySaoPaulo(new Date('2026-10-01T03:00:00Z'))).toBe('2026-10');
  });

  it('previousMonthKey vira o ano', () => {
    expect(previousMonthKey('2026-01')).toBe('2025-12');
    expect(previousMonthKey('2026-10')).toBe('2026-09');
  });

  it('trendVsPreviousPct não inventa número sem mês anterior', () => {
    expect(trendVsPreviousPct(1000, null)).toBeNull();
    expect(trendVsPreviousPct(1000, 0)).toBeNull();
    expect(trendVsPreviousPct(1100, 1000)).toBe(10);
    expect(trendVsPreviousPct(900, 1000)).toBe(-10);
  });
});

describe('lastMonthKeys', () => {
  it('devolve os N meses até o mês pedido, virando o ano', () => {
    expect(lastMonthKeys('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(lastMonthKeys('2026-10', 1)).toEqual(['2026-10']);
  });
});

describe('monthlyAverageCents', () => {
  it('ignora meses sem dado (antes de conectar o banco), mas conta zero de mês com dado', () => {
    expect(
      monthlyAverageCents([
        { amountCents: 0, hasData: false },
        { amountCents: 0, hasData: false },
        { amountCents: 30_000, hasData: true },
        { amountCents: 0, hasData: true },
        { amountCents: 60_000, hasData: true },
      ]),
    ).toBe(30_000);
  });

  it('sem nenhum mês com dado não inventa média', () => {
    expect(monthlyAverageCents([{ amountCents: 0, hasData: false }])).toBeNull();
  });

  it('arredonda pro centavo', () => {
    expect(monthlyAverageCents([{ amountCents: 100, hasData: true }, { amountCents: 101, hasData: true }])).toBe(101);
  });
});
