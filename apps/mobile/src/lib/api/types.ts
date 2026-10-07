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
