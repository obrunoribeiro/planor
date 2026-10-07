import { date, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createdAt, goalTypeEnum, id } from './_shared';
import { categories } from './categories';
import { households } from './household';
import { users } from './users';

// Nota: o §7 do CONTEXTO.md descreve `goals` de forma resumida (ele mesmo pede "detalhar no
// Drizzle"). `householdId` cobre a "meta da casa" (§6.11); a tabela `goalParticipants` abaixo
// cobre a "meta em grupo" entre amigos (§6.12), onde cada participante tem uma parte-alvo
// diferente (ex.: "Rafa 900, Bruno 600, Júlia 450, Pedro 300").

export const goals = pgTable('goals', {
  id: id(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }),
  type: goalTypeEnum('type').notNull(),
  name: text('name').notNull(),
  icon: text('icon'),
  targetCents: integer('target_cents').notNull(),
  deadline: date('deadline'),
  /** Só quando `type = 'category_limit'`. */
  categoryId: uuid('category_id').references(() => categories.id),
  /** Percentual (0–1) pra disparar `limit_80` (§6.9). */
  alertAtPct: real('alert_at_pct'),
  createdAt: createdAt(),
});

/** Participantes de uma meta em grupo entre amigos, cada um com a própria parte-alvo (§6.12). */
export const goalParticipants = pgTable(
  'goal_participants',
  {
    goalId: uuid('goal_id')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetShareCents: integer('target_share_cents').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.goalId, table.userId] })],
);

/** "Registrar valor guardado" — o dinheiro não é movido pelo Planor (§6.8). */
export const goalContributions = pgTable('goal_contributions', {
  id: id(),
  goalId: uuid('goal_id')
    .notNull()
    .references(() => goals.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  amountCents: integer('amount_cents').notNull(),
  /** Onde guardou: "Caixinha" | "Poupança" | "Outro" (texto livre, ver §6.8). */
  where: text('where'),
  createdAt: createdAt(),
});

/** 1 a 3 ações sugeridas por semana, geradas toda segunda (§6.4 e job `weekly-plan`). */
export const weeklyPlans = pgTable('weekly_plans', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  weekStart: date('week_start').notNull(),
  /** [{ type, title, description, actionRoute, completed, completedAutomatically }]. */
  items: jsonb('items').notNull().default([]),
});

export const alerts = pgTable('alerts', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** Um dos `alertType` listados no CONTEXTO.md §6.9 (charge_upcoming, limit_80, ...). */
  type: text('type').notNull(),
  payload: jsonb('payload').notNull().default({}),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: createdAt(),
  pushSentAt: timestamp('push_sent_at', { withTimezone: true }),
});
