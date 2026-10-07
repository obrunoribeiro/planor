import { integer, jsonb, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Agregados mensais recalculados pelo pipeline (§6.3, passo 9) — alimentam telas e a IA sem
 * reprocessar transações. `month` no formato "YYYY-MM".
 */
export const monthlySummaries = pgTable(
  'monthly_summaries',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    month: text('month').notNull(),
    incomeCents: integer('income_cents').notNull().default(0),
    spentCents: integer('spent_cents').notNull().default(0),
    /** { [categoryId]: amountCents }. */
    byCategory: jsonb('by_category').notNull().default({}),
    fixedCents: integer('fixed_cents').notNull().default(0),
    variableCents: integer('variable_cents').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.userId, table.month] })],
);

/** Já comprometido por mês futuro (parcelas + assinaturas + fixos) — alimenta a tela Futuro. */
export const committedByMonth = pgTable(
  'committed_by_month',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    month: text('month').notNull(),
    installmentsCents: integer('installments_cents').notNull().default(0),
    subscriptionsCents: integer('subscriptions_cents').notNull().default(0),
    billsCents: integer('bills_cents').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.userId, table.month] })],
);
