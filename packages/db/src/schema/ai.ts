import { integer, jsonb, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { aiRoleEnum, createdAt, id } from './_shared';
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
