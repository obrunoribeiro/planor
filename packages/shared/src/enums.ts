// Glossário — nomes usados no código, espelhando o CONTEXTO.md §2.

export const EXPENSE_KINDS = ['fixed', 'variable'] as const;
export type ExpenseKind = (typeof EXPENSE_KINDS)[number];

export const CATEGORY_SOURCES = ['user_rule', 'global_rule', 'ai', 'manual'] as const;
export type CategorySource = (typeof CATEGORY_SOURCES)[number];

export const RECURRENCE_KINDS = ['subscription', 'recurring_bill'] as const;
export type RecurrenceKind = (typeof RECURRENCE_KINDS)[number];

export const SUBSCRIPTION_USAGE = ['high', 'low', 'none', 'unknown'] as const;
export type SubscriptionUsage = (typeof SUBSCRIPTION_USAGE)[number];

export const HOUSEHOLD_MODES = ['couple', 'family', 'shared_home'] as const;
export type HouseholdMode = (typeof HOUSEHOLD_MODES)[number];

export const HOUSEHOLD_SPLIT_RULES = ['equal', 'income', 'custom'] as const;
export type HouseholdSplitRule = (typeof HOUSEHOLD_SPLIT_RULES)[number];

export const GOAL_TYPES = ['savings', 'category_limit'] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const PLANS = ['free', 'pro', 'pro_family'] as const;
export type Plan = (typeof PLANS)[number];
