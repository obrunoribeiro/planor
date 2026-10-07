// Helpers e enums compartilhados por todo o schema.
// Os enums que já existem como união de string em @planor/shared são reaproveitados aqui
// (uma fonte só de verdade entre código e banco); os específicos de persistência (status de
// conexão, tipo de conta etc.) são definidos localmente.

import {
  CATEGORY_SOURCES,
  EXPENSE_KINDS,
  GOAL_TYPES,
  HOUSEHOLD_MODES,
  HOUSEHOLD_SPLIT_RULES,
  PLANS,
  RECURRENCE_KINDS,
  SUBSCRIPTION_USAGE,
} from '@planor/shared';
import { pgEnum, timestamp, uuid } from 'drizzle-orm/pg-core';

export const id = () => uuid('id').primaryKey().defaultRandom();

/** Timestamp em UTC (CLAUDE.md, princípio 5 — "mês"/"hoje"/vencimento calculam em America/Sao_Paulo na aplicação). */
export const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const expenseKindEnum = pgEnum('expense_kind', EXPENSE_KINDS);
export const categorySourceEnum = pgEnum('category_source', CATEGORY_SOURCES);
export const recurrenceKindEnum = pgEnum('recurrence_kind', RECURRENCE_KINDS);
export const subscriptionUsageEnum = pgEnum('subscription_usage', SUBSCRIPTION_USAGE);
export const householdModeEnum = pgEnum('household_mode', HOUSEHOLD_MODES);
export const householdSplitRuleEnum = pgEnum('household_split_rule', HOUSEHOLD_SPLIT_RULES);
export const goalTypeEnum = pgEnum('goal_type', GOAL_TYPES);
export const planEnum = pgEnum('plan', PLANS);

export const platformEnum = pgEnum('platform', ['ios', 'android']);
export const accountTypeEnum = pgEnum('account_type', ['checking', 'savings', 'credit_card']);
export const connectionStatusEnum = pgEnum('connection_status', [
  'connected',
  'error',
  'disconnected',
  'consent_expired',
]);
export const cardStatementStatusEnum = pgEnum('card_statement_status', ['open', 'closed', 'paid']);
export const recurrenceStatusEnum = pgEnum('recurrence_status', [
  'active',
  'cancelled_by_user',
  'ended',
]);
export const inviteTypeEnum = pgEnum('invite_type', [
  'household',
  'friend',
  'goal',
  'challenge',
  'referral',
]);
export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'accepted', 'expired', 'declined']);
export const friendshipStatusEnum = pgEnum('friendship_status', ['pending', 'accepted', 'blocked']);
export const challengeMemberStatusEnum = pgEnum('challenge_member_status', [
  'active',
  'completed',
  'failed',
]);
export const householdRoleEnum = pgEnum('household_role', ['owner', 'member']);
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'cancelled',
  'expired',
]);
export const subscriptionStoreEnum = pgEnum('subscription_store', ['app_store', 'play_store']);
export const aiRoleEnum = pgEnum('ai_role', ['user', 'assistant', 'tool']);
export const postKindEnum = pgEnum('post_kind', [
  'challenge_progress',
  'goal_progress',
  'monthly_recap',
  'record',
]);
export const postAudienceEnum = pgEnum('post_audience', ['friends', 'group', 'person']);
