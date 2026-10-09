// Pipeline de dados, passo 2 — categorização por regras (CONTEXTO.md §6.3):
//   2.1 regras do usuário (correções que viraram regra) → `user_rule`;
//   2.2 regras globais (dicionário de comerciantes e palavras-chave) → `global_rule`.
// O passo 2.3 (LLM barato pro que sobrou) depende do provedor de IA, ainda em aberto
// (CONTEXTO.md §15.6) — o que nenhuma regra pega fica sem categoria e cai em "Outros" nos totais.
import type { CategorySource, ExpenseKind } from '../enums';
import { normalizeForMatch } from './normalize';

/** Categorias padrão do CONTEXTO.md §6.3, passo 3 — globais (`categories.user_id` nulo). */
export const DEFAULT_CATEGORY_NAMES = [
  'Moradia',
  'Mercado',
  'Delivery',
  'Transporte',
  'Saúde',
  'Assinaturas',
  'Contas da casa',
  'Lazer',
  'Educação',
  'Compras',
  'Outros',
] as const;
export type DefaultCategoryName = (typeof DEFAULT_CATEGORY_NAMES)[number];

type GlobalRule = { category: DefaultCategoryName; keywords: readonly string[] };

/**
 * Dicionário global. Cada palavra-chave casa por palavra inteira sobre o texto normalizado
 * (`normalizeForMatch`), então "mercado" não casa com "mercadopago". A ORDEM IMPORTA: a primeira
 * regra que casar vence — por isso "uber eats" (Delivery) vem antes de "uber" (Transporte),
 * "amazon prime" (Assinaturas) antes de "amazon" (Compras) e "mercado livre" (Compras) antes de
 * "mercado" (Mercado).
 *
 * Só entra nome inequívoco. Na dúvida (ex.: "Tiktok", que pode ser loja, moedas ou anúncio),
 * fica de fora — o usuário corrige uma vez com "Mudar categoria" e vira regra dele.
 */
export const GLOBAL_CATEGORY_RULES: readonly GlobalRule[] = [
  {
    category: 'Delivery',
    keywords: ['ifood', 'ifd', 'rappi', 'uber eats', 'ze delivery', '99food', 'aiqfome', 'james delivery'],
  },
  {
    category: 'Assinaturas',
    keywords: [
      'netflix', 'spotify', 'disney', 'hbo', 'hbomax', 'max com', 'amazon prime', 'prime video', 'primevideo',
      'youtube premium', 'youtubepremium', 'google one', 'apple com bill', 'applecombill', 'icloud', 'globoplay', 'deezer',
      'paramount', 'crunchyroll', 'openai', 'chatgpt', 'adobe', 'canva', 'microsoft 365', 'google workspace',
      'dropbox', 'notion', 'framer com', 'hostinger', 'hostingercombr', 'duolingo', 'smart fit', 'smartfit',
      'gympass', 'wellhub', 'totalpass',
    ],
  },
  {
    category: 'Compras',
    keywords: [
      'mercado livre', 'mercadolivre', 'shopee', 'amazon', 'amazon br', 'magalu', 'magazine luiza', 'americanas',
      'lojas americanas', 'shein', 'aliexpress', 'temu', 'renner', 'riachuelo', 'c a modas', 'centauro',
      'netshoes', 'kabum', 'casas bahia', 'ponto frio', 'decathlon', 'leroy merlin', 'zara',
    ],
  },
  {
    category: 'Transporte',
    keywords: [
      'uber', '99app', '99 pop', '99pop', '99 tecnologia', 'cabify', 'posto', 'auto posto', 'combustivel',
      'combustiveis', 'shell', 'ipiranga', 'petrobras', 'br mania', 'estapar', 'sem parar', 'semparar',
      'conectcar', 'veloe', 'pedagio', 'metro sp', 'cptm', 'bilhete unico', 'latam', 'gol linhas', 'azul linhas',
    ],
  },
  {
    category: 'Mercado',
    keywords: [
      'supermercado', 'supermercados', 'mercado', 'mercearia', 'hipermercado', 'hiper', 'atacadista',
      'atacadao', 'assai', 'carrefour', 'pao de acucar', 'sams club', 'makro', 'hortifruti',
      'sacolao', 'padaria', 'panificadora', 'panifcadora', 'acougue',
    ],
  },
  {
    category: 'Saúde',
    keywords: [
      'farmacia', 'drogaria', 'drogasil', 'droga raia', 'drogaraia', 'raia', 'pague menos', 'panvel',
      'unimed', 'hapvida', 'amil', 'sulamerica saude', 'bradesco saude', 'laboratorio', 'clinica', 'hospital',
      'odonto', 'dentista',
    ],
  },
  {
    category: 'Contas da casa',
    keywords: [
      'enel', 'cemig', 'copel', 'light sesa', 'cpfl', 'energisa', 'coelba', 'celpe', 'equatorial', 'sabesp', 'sanepar',
      'cedae', 'copasa', 'comgas', 'conta vivo', 'vivo', 'claro net', 'claro s a', 'tim celular', 'oi fibra', 'net servicos', 'condominio',
    ],
  },
  { category: 'Moradia', keywords: ['aluguel', 'imobiliaria', 'quintoandar', 'quinto andar'] },
  {
    category: 'Educação',
    keywords: ['escola', 'colegio', 'faculdade', 'universidade', 'educacional', 'curso', 'cursos', 'udemy', 'alura', 'coursera', 'hotmart', 'htm', 'kiwify', 'livraria'],
  },
  {
    category: 'Lazer',
    keywords: [
      'cinema', 'cinemark', 'ingresso', 'ingressos', 'veloxingressos', 'sympla', 'eventim', 'ticketmaster',
      'steam', 'playstation', 'xbox', 'nintendo', 'hotel', 'hotelaria', 'pousada', 'airbnb', 'booking',
    ],
  },
];

export type CategoryRuleInput = {
  matchType: 'merchant' | 'keyword';
  pattern: string;
  categoryId: string;
  expenseKind: ExpenseKind | null;
};

export type CategorizableTransaction = {
  descriptionRaw: string;
  merchantName: string | null;
  amountCents: number;
};

export type CategorizationResult = {
  source: Extract<CategorySource, 'user_rule' | 'global_rule'>;
  /** Preenchido em `user_rule` (a regra aponta pro id). */
  categoryId?: string;
  /** Preenchido em `global_rule` (o dicionário fala em nome; quem chama resolve pro id). */
  categoryName?: DefaultCategoryName;
  expenseKind: ExpenseKind | null;
};

function containsWord(haystack: string, needle: string): boolean {
  return needle.length > 0 && ` ${haystack} `.includes(` ${needle} `);
}

/** Regras do usuário primeiro, depois o dicionário global (só pra saídas — entrada não tem
 * categoria de gasto). `null` quando nada casa. */
export function categorizeTransaction(
  tx: CategorizableTransaction,
  userRules: readonly CategoryRuleInput[],
): CategorizationResult | null {
  const merchant = normalizeForMatch(tx.merchantName ?? '');
  const text = normalizeForMatch(`${tx.descriptionRaw} ${tx.merchantName ?? ''}`);

  for (const rule of userRules) {
    const pattern = normalizeForMatch(rule.pattern);
    const matches = rule.matchType === 'merchant' ? pattern === merchant || pattern === normalizeForMatch(tx.descriptionRaw) : containsWord(text, pattern);
    if (matches) return { source: 'user_rule', categoryId: rule.categoryId, expenseKind: rule.expenseKind };
  }

  if (tx.amountCents >= 0) return null;

  for (const rule of GLOBAL_CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => containsWord(text, keyword))) {
      return { source: 'global_rule', categoryName: rule.category, expenseKind: null };
    }
  }
  return null;
}

/**
 * Movimento interno da fatura do cartão (§6.3, passo 1 — "remoção de duplicatas entre conta e
 * cartão"), que vira `isTransfer` e sai de gasto e renda:
 * - pagamento da fatura: a mesma quantia aparece como saída na conta ("Pagamento de fatura") e
 *   como entrada no cartão ("Pagamento recebido") — as compras já contam uma vez, no cartão;
 * - saldo levado pra fatura seguinte ("Saldo em atraso", "Saldo em rotativo"): é a soma de
 *   compras que já contaram no mês em que aconteceram. Juros e multa NÃO entram aqui — são
 *   custo de verdade.
 */
export function isCardBillPayment(tx: { descriptionRaw: string; accountType: 'checking' | 'savings' | 'credit_card' }): boolean {
  const text = normalizeForMatch(tx.descriptionRaw);
  if (tx.accountType === 'credit_card') {
    return ['pagamento recebido', 'pagamento de fatura', 'saldo em atraso', 'saldo em rotativo', 'saldo anterior'].some((k) =>
      containsWord(text, k),
    );
  }
  return containsWord(text, 'pagamento de fatura') || containsWord(text, 'pagamento fatura') || containsWord(text, 'pgto fatura');
}
