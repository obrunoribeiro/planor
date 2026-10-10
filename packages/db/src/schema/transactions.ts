import { boolean, integer, pgTable, real, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { categorySourceEnum, expenseKindEnum, id } from './_shared';
import { accounts, cardStatements } from './connections';
import { categories } from './categories';
import { installmentPlans, recurrences } from './recurrences';
import { users } from './users';

export const transactions = pgTable(
  'transactions',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    /** Id da transação no agregador — usado na deduplicação (§6.3, passo 1). */
    externalId: text('external_id'),
    /** Compra no cartão entra pela DATA DA COMPRA, não a de fechamento da fatura (§6.4). */
    postedAt: timestamp('posted_at', { withTimezone: true }).notNull(),
    /** Centavos; saídas são negativas (CLAUDE.md, princípio 4). */
    amountCents: integer('amount_cents').notNull(),
    descriptionRaw: text('description_raw').notNull(),
    /** Normalizado, ex.: "IFOOD *PIZZARIA BELLA" → "Pizzaria Bella Massa" (§6.3, passo 1). */
    merchantName: text('merchant_name'),
    categoryId: uuid('category_id').references(() => categories.id),
    categorySource: categorySourceEnum('category_source'),
    /** Grau de confiança da categorização por IA, de 0 a 1. */
    confidence: real('confidence'),
    expenseKind: expenseKindEnum('expense_kind'),
    /** Oculta das análises (totais, categorias, plano) — continua no extrato (§6.5). */
    isHidden: boolean('is_hidden').notNull().default(false),
    /** Transferência entre contas próprias do usuário — nunca entra em `spentThisMonth` (§6.4). */
    isTransfer: boolean('is_transfer').notNull().default(false),
    installmentPlanId: uuid('installment_plan_id').references(() => installmentPlans.id),
    /** "n de m" da parcela, quando o agregador informa (§6.3, passo 4). Sem isso, o pipeline lê
     * o sufixo da descrição ("3/10", "PARC 03/10"). */
    installmentNumber: integer('installment_number'),
    installmentCount: integer('installment_count'),
    /** Mês da fatura em que a transação cai ("YYYY-MM"), quando o agregador informa. */
    billMonth: text('bill_month'),
    recurrenceId: uuid('recurrence_id').references(() => recurrences.id),
    statementId: uuid('statement_id').references(() => cardStatements.id),
    note: text('note'),
  },
  (table) => [
    uniqueIndex('transactions_account_external_id_idx').on(table.accountId, table.externalId),
  ],
);
