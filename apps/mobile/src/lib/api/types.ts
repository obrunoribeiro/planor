// Formatos de resposta da API — espelham o que `apps/api/src/routes/home.ts` e
// `apps/api/src/routes/transactions.ts` devolvem.
import type { Plan } from '@planor/shared';

export type WeeklyPlanItem = {
  type: string;
  title: string;
  description: string;
  actionRoute: string;
  completed: boolean;
  completedAutomatically: boolean;
};

export type HomeResponse = {
  month: string;
  user: { name: string | null; plan: Plan };
  unreadAlerts: number;
  leftover: {
    monthlyIncomeCents: number;
    spentThisMonthCents: number;
    dueUntilMonthEndCents: number;
    projectedLeftoverCents: number;
  };
  committed: { nextMonthLabel: string; nextMonthAmountCents: number; months: { label: string; amountCents: number }[] } | null;
  weeklyPlan: { doneCount: number; totalCount: number; items: WeeklyPlanItem[] };
  spendingThisMonth: { amountCents: number; trendVsLastMonthPct: number | null; sparkline: number[] };
  subscriptions: {
    count: number;
    monthlyCents: number;
    yearlyCents: number;
    unusedCount: number;
    avatars: { initials: string; colorToken: 'purple800' | 'alert800' }[];
  };
  installments: { count: number; monthlyCents: number; lastInstallmentDate: string | null; progress: { label: string; percent: number }[] };
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
};

export type FutureTimelineResponse = {
  committed: { untilLabel: string | null; totalCents: number; months: { label: string; amountCents: number; active: boolean }[] };
  currentMonth: {
    label: string;
    totalCents: number;
    installments: { count: number; amountCents: number };
    subscriptions: { count: number; amountCents: number };
    bills: { description: string; amountCents: number };
  } | null;
  statements: { bank: string; amountCents: number; dueDate: string }[];
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
  /** Conta: saldo. Cartão: fatura atual (saldo devedor, positivo). */
  balanceCents: number;
};

export type ConnectionListItem = {
  id: string;
  status: 'connected' | 'error' | 'disconnected' | 'consent_expired';
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
