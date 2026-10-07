import { jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id, subscriptionStatusEnum, subscriptionStoreEnum } from './_shared';
import { users } from './users';

/** Gerada no dia 1º pelo job `monthly-recap` — resumo do mês anterior em formato de story (§6.13). */
export const monthlyRecaps = pgTable(
  'monthly_recaps',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    month: text('month').notNull(),
    data: jsonb('data').notNull().default({}),
    /** Perfil do mês, ex.: "O Planejador" — regra determinística, a IA só escreve o texto (§6.13). */
    persona: text('persona'),
    sharedAt: timestamp('shared_at', { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.month] })],
);

/** Código de indicação de cada usuário, ex.: "BRUNO7K2" (§6.14). */
export const referrals = pgTable('referrals', {
  code: text('code').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const referralEventStatusEnum = pgEnum('referral_event_status', [
  'sent',
  'account_created',
  'bank_connected',
  'rewarded',
]);

/**
 * Recompensa de 1 mês de Pro só quando o indicado cria a conta e conecta o primeiro banco
 * (regra contra fraude), limitado a 12 meses de Pro grátis por ano (§6.14).
 */
export const referralEvents = pgTable('referral_events', {
  id: id(),
  code: text('code')
    .notNull()
    .references(() => referrals.code, { onDelete: 'cascade' }),
  invitedUserId: uuid('invited_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: referralEventStatusEnum('status').notNull().default('sent'),
  rewardedAt: timestamp('rewarded_at', { withTimezone: true }),
});

/**
 * Entitlement — fonte da verdade vem dos webhooks do RevenueCat; o app só consulta o backend,
 * nunca confia só no app (§6.15). Um registro por usuário, atualizado a cada webhook.
 */
export const subscriptions = pgTable('subscriptions', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** Identificador do produto na loja (ex.: "pro_annual", "familia_monthly"). */
  product: text('product'),
  status: subscriptionStatusEnum('status').notNull().default('expired'),
  periodEnd: timestamp('period_end', { withTimezone: true }),
  trialEnd: timestamp('trial_end', { withTimezone: true }),
  store: subscriptionStoreEnum('store'),
  /** `app_user_id` do RevenueCat. */
  rcCustomerId: text('rc_customer_id'),
});
