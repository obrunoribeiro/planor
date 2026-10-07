import { boolean, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { expenseKindEnum, id } from './_shared';
import { users } from './users';

/**
 * Categorias globais (`userId` nulo — Moradia, Mercado, Delivery, Transporte, Saúde,
 * Assinaturas, Contas da casa, Lazer, Educação, Compras, Outros, ver CONTEXTO.md §6.3)
 * e categorias criadas pelo próprio usuário.
 */
export const categories = pgTable('categories', {
  id: id(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon'),
  defaultKind: expenseKindEnum('default_kind').notNull().default('variable'),
  includeInAnalysis: boolean('include_in_analysis').notNull().default(true),
});

export const categoryRuleMatchTypeEnum = pgEnum('category_rule_match_type', ['merchant', 'keyword']);

/** Regra do usuário: "sempre que o comerciante/termo bater, categorize assim" (§6.3, passo 2.1). */
export const categoryRules = pgTable('category_rules', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  matchType: categoryRuleMatchTypeEnum('match_type').notNull(),
  pattern: text('pattern').notNull(),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => categories.id),
  expenseKind: expenseKindEnum('expense_kind'),
});
