import { boolean, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createdAt, householdModeEnum, householdRoleEnum, householdSplitRuleEnum, id, inviteStatusEnum, inviteTypeEnum } from './_shared';
import { categories } from './categories';
import { transactions } from './transactions';
import { users } from './users';

export const households = pgTable('households', {
  id: id(),
  mode: householdModeEnum('mode').notNull(),
  splitRule: householdSplitRuleEnum('split_rule').notNull().default('equal'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
});

export const householdMembers = pgTable(
  'household_members',
  {
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: householdRoleEnum('role').notNull().default('member'),
    /** Percentual na divisão (0–1) quando `splitRule` é 'income' ou 'custom'. */
    sharePct: real('share_pct'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.householdId, table.userId] })],
);

/** Quais categorias de cada pessoa entram na casa — cada um escolhe as próprias (§6.11). */
export const householdCategories = pgTable(
  'household_categories',
  {
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    enabled: boolean('enabled').notNull().default(true),
  },
  (table) => [primaryKey({ columns: [table.householdId, table.userId, table.categoryId] })],
);

export const householdExpenses = pgTable('household_expenses', {
  id: id(),
  householdId: uuid('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  transactionId: uuid('transaction_id')
    .notNull()
    .references(() => transactions.id),
  paidBy: uuid('paid_by')
    .notNull()
    .references(() => users.id),
  /** Override pontual da divisão pra essa despesa: { [userId]: amountCents }. */
  split: jsonb('split').notNull().default({}),
});

/**
 * Acerto entre pessoas da casa OU entre amigos (`householdId` nulo — "Acertos com amigos",
 * §6.12). O Planor não transfere dinheiro — isto só registra que o pagamento aconteceu fora
 * do app (CLAUDE.md, princípio 1).
 */
export const settlements = pgTable('settlements', {
  id: id(),
  householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }),
  fromUser: uuid('from_user')
    .notNull()
    .references(() => users.id),
  toUser: uuid('to_user')
    .notNull()
    .references(() => users.id),
  amountCents: integer('amount_cents').notNull(),
  /** "YYYY-MM" — mês a que o acerto se refere. */
  month: text('month'),
  note: text('note'),
  createdAt: createdAt(),
});

/** Convite por celular, e-mail ou link — válido por 7 dias pra casa (§6.11). */
export const invites = pgTable('invites', {
  id: id(),
  type: inviteTypeEnum('type').notNull(),
  code: text('code').notNull(),
  fromUser: uuid('from_user')
    .notNull()
    .references(() => users.id),
  toContact: text('to_contact'),
  status: inviteStatusEnum('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});
