// Formatos de resposta da API — espelham o que `apps/api/src/routes/home.ts` e
// `apps/api/src/routes/transactions.ts` devolvem.
import type { Plan } from '@planor/shared';

/** Mesmo formato de `WeeklyPlanItem` em `packages/shared/src/calculations/weeklyPlan.ts`. */
export type WeeklyPlanItem = {
  type: 'income' | 'card_bill' | 'subscription_usage' | 'category_limit' | 'categorize';
  title: string;
  description: string;
  actionLabel: string;
  actionRoute: string;
  completed: boolean;
  /** "YYYY-MM-DD". */
  completedAt: string | null;
  completedAutomatically: boolean;
};

export type WeeklyPlanResponse = {
  weekStartKey: string;
  weekEndKey: string;
  /** "5 a 11 de outubro". */
  label: string;
  items: WeeklyPlanItem[];
};

export type HomeResponse = {
  month: string;
  user: { name: string | null; plan: Plan };
  unreadAlerts: number;
  leftover: {
    monthlyIncomeCents: number;
    spentThisMonthCents: number;
    dueUntilMonthEndCents: number;
    /** Compras que o banco ainda não detalhou — já incluídas em `spentThisMonthCents`. */
    undetailedCents: number;
    projectedLeftoverCents: number;
  };
  committed: {
    nextMonthLabel: string;
    nextMonthAmountCents: number;
    months: { label: string; amountCents: number }[];
  } | null;
  weeklyPlan: { label: string; doneCount: number; totalCount: number; items: WeeklyPlanItem[] };
  spendingThisMonth: {
    amountCents: number;
    trendVsLastMonthPct: number | null;
    sparkline: number[];
  };
  subscriptions: {
    count: number;
    monthlyCents: number;
    yearlyCents: number;
    unusedCount: number;
    avatars: { initials: string; colorToken: 'purple800' | 'alert800' }[];
  };
  installments: {
    count: number;
    monthlyCents: number;
    lastInstallmentDate: string | null;
    progress: { label: string; percent: number }[];
  };
  fixedVsVariable: { fixedCents: number; variableCents: number; fixedPct: number };
  /** Mês da retrospectiva mais recente (ex.: "setembro"), ou `null` quando ainda não existe uma
   * gerada (job `monthly-recap`, Fase 5 — CONTEXTO.md §13) — hoje é sempre `null`. */
  retrospective: string | null;
};

export type SpendingCategory = {
  categoryId: string;
  name: string;
  amountCents: number;
  kind: 'fixed' | 'variable';
  pctOfTotal: number;
};

export type SpendingSummaryResponse = {
  month: string;
  totalCents: number;
  categoriesCount: number;
  trendVsLastMonthPct: number | null;
  fixedCents: number;
  variableCents: number;
  fixedPct: number;
  variablePct: number;
  categories: SpendingCategory[];
  /** Compras no cartão que o banco ainda não mandou como transação (já somadas em `totalCents`). */
  undetailed: { amountCents: number; pctOfTotal: number } | null;
};

export type LeftoverForecastResponse = {
  month: string;
  /** Último dia do mês, "YYYY-MM-DD". */
  monthEndDateKey: string;
  monthlyIncomeCents: number;
  /** Já inclui `undetailedCents`. */
  spentThisMonthCents: number;
  undetailedCents: number;
  due: {
    installmentsCents: number;
    subscriptionsCents: number;
    billsCents: number;
    otherCents: number;
    totalCents: number;
  };
  projectedLeftoverCents: number;
};

export type InstallmentPlanItem = {
  id: string;
  /** O nome escolhido em "Editar parcelamento", ou o detectado. */
  merchantName: string;
  detectedName: string;
  categoryId: string | null;
  /** "Já quitei antecipado": fica no fim da lista e fora dos totais. */
  settledEarly: boolean;
  bank: string;
  installmentCents: number;
  totalCents: number;
  count: number;
  /** Parcela deste mês (1 a `count`). */
  current: number;
  /** "YYYY-MM". */
  firstMonth: string;
  lastMonth: string;
  paidCents: number;
  remainingCents: number;
  /** "YYYY-MM-DD", ou "YYYY-MM" sem dia de vencimento; nulo na última parcela. */
  nextDue: string | null;
};

export type InstallmentsResponse = {
  monthlyCents: number;
  remainingCents: number;
  lastMonth: string | null;
  plans: InstallmentPlanItem[];
};

export type SubscriptionUsage = 'high' | 'low' | 'none' | 'unknown';

export type SubscriptionItem = {
  id: string;
  merchantName: string;
  amountCents: number;
  nextChargeAt: string | null;
  usage: SubscriptionUsage;
  status: 'active' | 'cancelled_by_user';
  cancelledAt: string | null;
  /** Banco da cobrança mais recente. */
  bank: string | null;
  /** Primeira cobrança da série detectada (ISO). */
  since: string | null;
  paidThisYearCents: number;
  priceChange: { fromCents: number; toCents: number; at: string; pct: number } | null;
};

export type SubscriptionsResponse = {
  monthlyCents: number;
  yearlyCents: number;
  unused: { count: number; monthlyCents: number };
  items: SubscriptionItem[];
};

export type FixedBillItem = {
  id: string;
  /** Detectado nas transações, ou cadastrado à mão em "Nova conta fixa" (só esse dá pra remover). */
  source: 'detected' | 'manual';
  name: string;
  amountCents: number;
  /** Dia do mês em que cobra. */
  day: number | null;
  paidWith: string | null;
  /** Valor pela média das 3 últimas (conta que varia, como energia). */
  estimated: boolean;
};

export type FixedBillsResponse = {
  /** "YYYY-MM". */
  nextMonth: string;
  monthlyCents: number;
  items: FixedBillItem[];
};

export type FutureTimelineResponse = {
  committed: {
    untilLabel: string | null;
    totalCents: number;
    months: { label: string; amountCents: number; active: boolean }[];
  };
  currentMonth: {
    label: string;
    totalCents: number;
    installments: { count: number; amountCents: number };
    subscriptions: { count: number; amountCents: number };
    bills: { description: string; amountCents: number };
  } | null;
  statements: { accountId: string; bank: string; amountCents: number; dueDate: string }[];
};

/** `GET /future/statements/:accountId` — fatura do cartão (§6.6). */
export type CardStatementResponse = {
  accountId: string;
  bank: string;
  /** Mês do vencimento, "YYYY-MM". */
  month: string;
  /** `closed` = já fechou; `open` = ainda recebe compras; `future` = só parcelas já lançadas. */
  kind: 'closed' | 'open' | 'future';
  paid: boolean;
  totalCents: number;
  /** "YYYY-MM-DD". */
  closingDate: string;
  dueDate: string;
  installments: {
    totalCents: number;
    items: { name: string; number: number | null; count: number | null; amountCents: number }[];
  };
  subscriptions: { totalCents: number; count: number; unusedCount: number };
  bills: { totalCents: number; items: { name: string; amountCents: number }[] };
  otherPurchases: { totalCents: number; count: number };
  undetailedCents: number;
};

export type MeResponse = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  monthlyIncomeCents: number | null;
  payday: number | null;
  plan: Plan;
};

export type SettingsResponse = {
  userId: string;
  hideValuesOnOpen: boolean;
  biometricLock: boolean;
  lockAfterSeconds: number;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  useAnonymizedData: boolean;
};

export type CategoryListItem = {
  id: string;
  name: string;
  kind: 'fixed' | 'variable';
  includeInAnalysis: boolean;
};

export type AccountListItem = {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit_card';
};

export type ImportResultResponse = {
  total: number;
  imported: number;
  duplicates: number;
};

export type ConnectionAccount = {
  id: string;
  type: 'checking' | 'savings' | 'credit_card';
  name: string;
  /** Conta: saldo. Cartão: limite usado (inclui parcelas de faturas futuras). */
  balanceCents: number;
  /** Só no cartão: fatura aberta. Nulo até a primeira sincronização depois desse campo existir. */
  currentBillCents: number | null;
};

export type ConnectionListItem = {
  id: string;
  status: 'connected' | 'error' | 'disconnected' | 'consent_expired';
  /** Quando o usuário autorizou o acesso (`createdAt` do item no Pluggy). */
  authorizedAt: string | null;
  consentExpiresAt: string | null;
  /** Dias de calendário até o consentimento vencer (America/Sao_Paulo); negativo = já venceu. */
  consentDaysLeft: number | null;
  lastSyncAt: string | null;
  errorCode: string | null;
  institutionName: string;
  institutionLogo: string | null;
  accounts: ConnectionAccount[];
};

export type TransactionListItem = {
  id: string;
  postedAt: string;
  /** Dia em America/Sao_Paulo, ex.: "2026-10-04" — já vem pronto do backend pra agrupar a lista. */
  postedAtDateKey: string;
  descriptionRaw: string;
  merchantName: string | null;
  amountCents: number;
  categoryId: string | null;
  categoryName: string | null;
  expenseKind: 'fixed' | 'variable' | null;
  isHidden: boolean;
  isInstallment: boolean;
  accountName: string | null;
};

/** `GET /spending/category/:id` — Gastos · Categoria (§6.5). */
export type CategoryDetailResponse = {
  category: { id: string; name: string; kind: 'fixed' | 'variable' };
  month: string;
  totalCents: number;
  transactionsCount: number;
  /** `null` sem nenhuma compra no mês. */
  averageTicketCents: number | null;
  /** Últimos 6 meses, do mais antigo pro mês pedido. */
  months: { month: string; label: string; amountCents: number }[];
  /** Média só dos meses em que já havia dado (`null` se nenhum). */
  monthlyAverageCents: number | null;
  transactions: TransactionListItem[];
};

export type TransactionDetailResponse = {
  id: string;
  postedAt: string;
  descriptionRaw: string;
  merchantName: string | null;
  amountCents: number;
  categoryId: string | null;
  categoryName: string | null;
  categorySource: 'user_rule' | 'global_rule' | 'ai' | 'manual' | null;
  expenseKind: 'fixed' | 'variable' | null;
  isHidden: boolean;
  isInstallment: boolean;
  note: string | null;
  accountName: string | null;
  statement: { period: string; dueDate: string | null } | null;
};

export type TransactionListFilters = {
  month?: string;
  type?: 'todas' | 'saidas' | 'entradas' | 'parcelas';
  q?: string;
  accountIds?: string[];
  categoryIds?: string[];
  minCents?: number;
  maxCents?: number;
};

/** `GET /alerts` — central de alertas (§6.9). Texto, ícone e destino já vêm prontos da API. */
export type AlertItem = {
  id: string;
  type: string;
  createdAt: string;
  read: boolean;
  title: string;
  body: string;
  tone: 'brand' | 'alert' | 'error' | 'success';
  icon: string;
  route: string | null;
  important: boolean;
};

export type AlertsResponse = { unreadCount: number; items: AlertItem[] };

/** Cartão de dados de uma resposta da IA (gráfico da categoria, Figma 33:674). Números da API. */
export type AiCategoryCard = {
  type: 'category';
  title: string;
  totalCents: number;
  pctVsAverage: number | null;
  months: { label: string; amountCents: number; active: boolean }[];
};

export type AiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  card: AiCategoryCard | null;
  createdAt: string;
};

/** Cota de perguntas do mês (§6.7). `limit` nulo = ilimitado (Pro). */
export type AiUsage = { used: number; limit: number | null; month: string };

export type AiChatResponse = { conversationId: string; message: AiMessage; usage: AiUsage };

export type AiConversationListItem = {
  id: string;
  title: string;
  preview: string | null;
  lastMessageAt: string;
};

export type AiConversationResponse = { id: string; title: string; messages: AiMessage[] };
