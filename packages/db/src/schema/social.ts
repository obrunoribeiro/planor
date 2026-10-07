import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { challengeMemberStatusEnum, createdAt, friendshipStatusEnum, id, postAudienceEnum, postKindEnum } from './_shared';
import { transactions } from './transactions';
import { users } from './users';

/**
 * Amizade entre `userA` e `userB`. Regra de privacidade fixa: amigos nunca veem saldo, renda,
 * gastos nem transações (§6.12) — só o que fazem juntos (metas, despesas divididas, desafios).
 */
export const friendships = pgTable(
  'friendships',
  {
    userA: uuid('user_a')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userB: uuid('user_b')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: friendshipStatusEnum('status').notNull().default('pending'),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.userA, table.userB] })],
);

export const posts = pgTable('posts', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  kind: postKindEnum('kind').notNull(),
  payload: jsonb('payload').notNull().default({}),
  audience: postAudienceEnum('audience').notNull().default('friends'),
  /** Mostrar valores em reais — desligado por padrão (§6.12, Privacidade do feed). */
  showValues: boolean('show_values').notNull().default(false),
  createdAt: createdAt(),
});

export const postReactions = pgTable(
  'post_reactions',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull().default('clap'),
  },
  (table) => [primaryKey({ columns: [table.postId, table.userId] })],
);

export const postComments = pgTable('post_comments', {
  id: id(),
  postId: uuid('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: createdAt(),
});

/** Modelos: Sem delivery, Semana sem cartão, Mercado com lista, R$ 10 por dia, Sem compra por impulso (§6.12). */
export const challenges = pgTable('challenges', {
  id: id(),
  template: text('template').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  /** Duração, folgas por semana, categoria verificada etc. */
  rules: jsonb('rules').notNull().default({}),
  /** Combinado opcional em texto livre, ex.: "Quem perder paga o açaí". */
  stakeText: text('stake_text'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
});

export const challengeMembers = pgTable(
  'challenge_members',
  {
    challengeId: uuid('challenge_id')
      .notNull()
      .references(() => challenges.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    daysDone: integer('days_done').notNull().default(0),
    daysFailed: integer('days_failed').notNull().default(0),
    skipsUsed: integer('skips_used').notNull().default(0),
    status: challengeMemberStatusEnum('status').notNull().default('active'),
  },
  (table) => [primaryKey({ columns: [table.challengeId, table.userId] })],
);

/** Dividir despesa com amigos — na análise de gastos só entra a parte do próprio usuário (§6.12). */
export const splitExpenses = pgTable('split_expenses', {
  id: id(),
  transactionId: uuid('transaction_id')
    .notNull()
    .references(() => transactions.id, { onDelete: 'cascade' }),
  payerId: uuid('payer_id')
    .notNull()
    .references(() => users.id),
  /** { [userId]: amountCents }. */
  parts: jsonb('parts').notNull().default({}),
});
