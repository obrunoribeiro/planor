import { boolean, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, planEnum, platformEnum } from './_shared';

export const users = pgTable(
  'users',
  {
    // Sem defaultRandom() de propósito: o id tem que ser o MESMO id do usuário no Supabase
    // Auth (auth.users.id), não um UUID aleatório nosso — ver apps/api/src/lib/auth.ts, que
    // cria essa linha usando o id que o Supabase já gerou no cadastro.
    id: uuid('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    monthlyIncomeCents: integer('monthly_income_cents'),
    /** Dia do mês em que recebe o salário (1–31). Usado no cálculo da sobra prevista. */
    payday: integer('payday'),
    /** Sentimento com dinheiro no onboarding, escala de 1 a 5 — define o tom da IA. */
    feelingScore: integer('feeling_score'),
    /** Objetivos marcados no onboarding (parcelas, assinaturas, sobra, dívidas, meta, ...). */
    onboardingGoals: text('onboarding_goals').array(),
    plan: planEnum('plan').notNull().default('free'),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex('users_email_idx').on(table.email)],
);

export const devices = pgTable('devices', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  platform: platformEnum('platform').notNull(),
  pushToken: text('push_token'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
});

export const settings = pgTable('settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  hideValuesOnOpen: boolean('hide_values_on_open').notNull().default(false),
  biometricLock: boolean('biometric_lock').notNull().default(false),
  lockAfterSeconds: integer('lock_after_seconds').notNull().default(60),
  /** Horário silencioso para push, ex.: "22:00"–"08:00" (ver CONTEXTO.md §6.9). */
  quietHoursStart: text('quiet_hours_start').default('22:00'),
  quietHoursEnd: text('quiet_hours_end').default('08:00'),
  useAnonymizedData: boolean('use_anonymized_data').notNull().default(false),
});

/** Liga/desliga por `alertType` (ver a tabela de tipos no CONTEXTO.md §6.9). */
export const notificationPrefs = pgTable(
  'notification_prefs',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    alertType: text('alert_type').notNull(),
    enabled: boolean('enabled').notNull().default(true),
  },
  (table) => [uniqueIndex('notification_prefs_user_type_idx').on(table.userId, table.alertType)],
);
