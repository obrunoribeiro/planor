import { integer, jsonb, pgTable, primaryKey, real, text, uuid } from 'drizzle-orm/pg-core';
import { aiRoleEnum, createdAt, id } from './_shared';
import { categories } from './categories';
import { users } from './users';

export const aiConversations = pgTable('ai_conversations', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title'),
  createdAt: createdAt(),
});

/**
 * Mensagens da Planor IA. `toolCalls` registra as ferramentas (function calling) executadas no
 * backend com SQL determinístico (§6.7) — a IA nunca faz conta, só escreve texto em cima do
 * resultado pronto (CLAUDE.md, princípio 2).
 */
export const aiMessages = pgTable('ai_messages', {
  id: id(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => aiConversations.id, { onDelete: 'cascade' }),
  role: aiRoleEnum('role').notNull(),
  content: text('content').notNull(),
  toolCalls: jsonb('tool_calls'),
  tokens: integer('tokens'),
});

/** Cota mensal — 10 perguntas no Grátis, ilimitado (com limite justo) no Pro (§6.7). */
export const aiUsage = pgTable(
  'ai_usage',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    month: text('month').notNull(),
    questionsCount: integer('questions_count').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.userId, table.month] })],
);

/**
 * Resposta da IA pra categoria de um estabelecimento (§6.3, passo 2.3) — cache por usuário, pra
 * nunca perguntar duas vezes pelo mesmo (`merchantKey` = `normalizeForMatch` do nome). Guarda
 * também quando a IA não soube (`categoryId` nulo) ou teve pouca confiança, que aí a transação
 * fica sem categoria e o usuário escolhe.
 */
export const aiMerchantCategories = pgTable(
  'ai_merchant_categories',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    merchantKey: text('merchant_key').notNull(),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    confidence: real('confidence').notNull(),
    model: text('model').notNull(),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.merchantKey] })],
);
