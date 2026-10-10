import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { accountTypeEnum, cardStatementStatusEnum, connectionStatusEnum, id } from './_shared';
import { users } from './users';

/** Catálogo de bancos suportados pelo agregador (Pluggy no plano inicial — ver CONTEXTO.md §6.2). */
export const institutions = pgTable(
  'institutions',
  {
    id: id(),
    name: text('name').notNull(),
    logo: text('logo'),
    /** Id do "connector" do Pluggy — único por banco no catálogo deles. */
    aggregatorId: text('aggregator_id').notNull(),
  },
  (table) => [uniqueIndex('institutions_aggregator_id_idx').on(table.aggregatorId)],
);

export const connections = pgTable(
  'connections',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    institutionId: uuid('institution_id')
      .notNull()
      .references(() => institutions.id),
    /** `item_id` do agregador — usado pra casar os webhooks (`item/created`, etc.). */
    aggregatorItemId: text('aggregator_item_id').notNull(),
    status: connectionStatusEnum('status').notNull().default('connected'),
    /** Consentimento válido por até 12 meses — avisar com 7 e 1 dia de antecedência (§6.2). */
    consentExpiresAt: timestamp('consent_expires_at', { withTimezone: true }),
    /** Quando o usuário autorizou o acesso — `createdAt` do item no Pluggy (§6.10, "Detalhe da
     * conexão"). Nulo até a próxima sincronização pra conexões criadas antes desta coluna. */
    authorizedAt: timestamp('authorized_at', { withTimezone: true }),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    errorCode: text('error_code'),
  },
  (table) => [uniqueIndex('connections_aggregator_item_id_idx').on(table.aggregatorItemId)],
);

export const accounts = pgTable(
  'accounts',
  {
    id: id(),
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => connections.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: accountTypeEnum('type').notNull(),
    name: text('name').notNull(),
    balanceCents: integer('balance_cents').notNull().default(0),
    currency: text('currency').notNull().default('BRL'),
    /** Id da conta no agregador — nulo pra contas que nunca passaram pelo Pluggy (ex.: criadas só
     * pelo seed ou por "Importar fatura"). Único quando presente, pra re-sync não duplicar. */
    externalId: text('external_id'),
  },
  (table) => [uniqueIndex('accounts_external_id_idx').on(table.externalId)],
);

/** Extensão 1:1 de `accounts` para o tipo `credit_card`. */
export const creditCards = pgTable('credit_cards', {
  accountId: uuid('account_id')
    .primaryKey()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  closingDay: integer('closing_day').notNull(),
  dueDay: integer('due_day').notNull(),
  limitCents: integer('limit_cents'),
});

export const cardStatements = pgTable('card_statements', {
  id: id(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  /** Mês de referência da fatura, formato "YYYY-MM". */
  period: text('period').notNull(),
  closingDate: timestamp('closing_date', { withTimezone: true }).notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  totalCents: integer('total_cents').notNull().default(0),
  status: cardStatementStatusEnum('status').notNull().default('open'),
});
