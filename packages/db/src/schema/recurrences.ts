import { boolean, date, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id, recurrenceKindEnum, recurrenceStatusEnum, subscriptionUsageEnum } from './_shared';
import { accounts } from './connections';
import { users } from './users';

/** Compra parcelada detectada ("PARC 3/10") — parcelas futuras são projetadas (§6.3, passo 4). */
export const installmentPlans = pgTable('installment_plans', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id),
  merchantName: text('merchant_name').notNull(),
  totalCents: integer('total_cents').notNull(),
  installmentCents: integer('installment_cents').notNull(),
  count: integer('count').notNull(),
  current: integer('current').notNull(),
  firstDate: date('first_date').notNull(),
  lastDate: date('last_date').notNull(),
  settledEarly: boolean('settled_early').notNull().default(false),
});

/**
 * Assinatura (serviço digital) ou fixo recorrente (condomínio, internet, energia, plano de
 * celular) detectado automaticamente: mesmo comerciante, valor parecido (±10%), intervalo de
 * 28–35 dias, por pelo menos 2 ocorrências (§6.3, passo 5).
 */
export const recurrences = pgTable('recurrences', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  kind: recurrenceKindEnum('kind').notNull(),
  merchantName: text('merchant_name').notNull(),
  amountCents: integer('amount_cents').notNull(),
  cadenceDays: integer('cadence_days').notNull(),
  nextChargeAt: timestamp('next_charge_at', { withTimezone: true }),
  /** O banco não revela uso — quem marca é o usuário ("Uso com frequência/pouco/Não uso", §6.3, passo 8). */
  usage: subscriptionUsageEnum('usage').notNull().default('unknown'),
  /** Histórico de valores, pra detectar reajuste: [{ amountCents, at }]. */
  priceHistory: jsonb('price_history').notNull().default([]),
  status: recurrenceStatusEnum('status').notNull().default('active'),
  /** true quando o valor é estimado pela média de 3 meses (ex.: conta de energia). */
  estimated: boolean('estimated').notNull().default(false),
});

/** Conta fixa cadastrada manualmente (não detectada por recorrência — §6.6). */
export const manualRecurringBills = pgTable('manual_recurring_bills', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  amountCents: integer('amount_cents').notNull(),
  /** Dia do mês em que a conta vence. */
  day: integer('day').notNull(),
  paidWith: text('paid_with'),
});
