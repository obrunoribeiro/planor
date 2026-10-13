// Planor IA (chat com function calling) — CONTEXTO.md §6.7, §8.
// A IA nunca faz conta: as ferramentas (src/ai/tools.ts) chamam as mesmas rotas que as telas usam
// e devolvem números prontos; o modelo só escreve o texto (CLAUDE.md, princípio 2).
//
// Streaming SSE com `?stream=1` (§8). Diferente do §6.7, por enquanto (ver PROGRESSO.md): um
// modelo só (Sonnet), sem o classificador de intenção; sem cache de prompt (o prompt de sistema
// ainda é menor que o mínimo de cache da Anthropic).
import { createAnthropic } from '@ai-sdk/anthropic';
import { stepCountIs, streamText, type ModelMessage } from 'ai';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { aiConversations, aiMessages, aiUsage, users } from '@planor/db';
import { monthKeySaoPaulo } from '@planor/shared';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { buildTools, makeFetcher, type ChatCard } from '../ai/tools';
import { systemPrompt } from '../ai/prompt';
import { env } from '../env';
import { requireUserId } from '../lib/auth';
import { db } from '../lib/db';

export const AI_CHAT_MODEL = 'claude-sonnet-5-5';
/** Plano Grátis: 10 perguntas por mês (§6.7). Pro: ilimitado (com uso justo). */
export const FREE_MONTHLY_QUESTIONS = 10;
/** Mensagens anteriores da conversa que vão de contexto. */
const HISTORY_MESSAGES = 12;
const MAX_STEPS = 6;
const MAX_OUTPUT_TOKENS = 700;

type StoredExtras = { card?: ChatCard | null; tools?: string[] };

async function usageFor(userId: string, plan: string, month: string) {
  const [row] = await db
    .select({ count: aiUsage.questionsCount })
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), eq(aiUsage.month, month)));
  return { used: row?.count ?? 0, limit: plan === 'free' ? FREE_MONTHLY_QUESTIONS : null, month };
}

function todayLabel(now: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);
}

export async function aiRoutes(app: FastifyInstance) {
  app.get('/ai/usage', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const [user] = await db.select({ plan: users.plan }).from(users).where(eq(users.id, userId));
    return usageFor(userId, user?.plan ?? 'free', monthKeySaoPaulo(new Date()));
  });

  const chatSchema = z.object({
    conversationId: z.string().uuid().optional(),
    message: z.string().trim().min(1).max(1000),
  });
  app.post('/ai/chat', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const body = chatSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_request' });
    if (!env.ANTHROPIC_API_KEY) return reply.code(503).send({ error: 'ai_unavailable' });

    const now = new Date();
    const month = monthKeySaoPaulo(now);
    const [user] = await db
      .select({ name: users.name, plan: users.plan, feelingScore: users.feelingScore })
      .from(users)
      .where(eq(users.id, userId));
    const usage = await usageFor(userId, user?.plan ?? 'free', month);
    if (usage.limit !== null && usage.used >= usage.limit)
      return reply.code(402).send({ error: 'quota_exceeded', ...usage });

    // Conversa: a existente (do usuário) ou uma nova, com a primeira pergunta de título.
    let conversationId = body.data.conversationId;
    if (conversationId) {
      const [owned] = await db
        .select({ id: aiConversations.id })
        .from(aiConversations)
        .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)));
      if (!owned) return reply.code(404).send({ error: 'conversation_not_found' });
    } else {
      const [created] = await db
        .insert(aiConversations)
        .values({ userId, title: body.data.message.slice(0, 80) })
        .returning({ id: aiConversations.id });
      conversationId = created!.id;
    }

    const history = conversationId
      ? (
          await db
            .select({ role: aiMessages.role, content: aiMessages.content })
            .from(aiMessages)
            .where(
              and(
                eq(aiMessages.conversationId, conversationId),
                inArray(aiMessages.role, ['user', 'assistant']),
              ),
            )
            .orderBy(desc(aiMessages.createdAt))
            .limit(HISTORY_MESSAGES)
        ).reverse()
      : [];
    const messages: ModelMessage[] = [
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: body.data.message },
    ];

    let card: ChatCard | null = null;
    // Um cartão por resposta: uma proposta (limite/meta) vale mais que o gráfico de contexto.
    const tools = buildTools(makeFetcher(app, request.headers.authorization!), (c) => {
      const current = card as ChatCard | null;
      if (c.type === 'category' && current && current.type !== 'category') return;
      card = c;
    });

    // Streaming (SSE) quando o app pede `?stream=1`: o texto chega em pedaços (`delta`) e, no fim,
    // um `done` com a mensagem salva, o cartão e a cota — o mesmo corpo da resposta sem stream.
    const streaming = (request.query as { stream?: string }).stream === '1';
    const result = streamText({
      model: createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })(AI_CHAT_MODEL),
      system: systemPrompt({
        name: user?.name?.split(' ')[0] ?? null, // só o primeiro nome (§10: o mínimo de dado pessoal)
        todayLabel: todayLabel(now),
        currentMonth: month,
        feelingScore: user?.feelingScore ?? null,
      }),
      messages,
      tools,
      stopWhen: stepCountIs(MAX_STEPS),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });

    const send = (event: string, data: unknown) => reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    if (streaming) {
      reply.hijack();
      reply.raw.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    }

    let text = '';
    let toolNames: string[];
    let tokens: number;
    try {
      // `fullStream`, não `textStream`: o `textStream` engole erro do provedor (chave vencida, sem
      // crédito) e terminaria vazio.
      for await (const part of result.fullStream) {
        if (part.type === 'error') throw part.error;
        if (part.type !== 'text-delta') continue;
        text += part.text;
        if (streaming) send('delta', { text: part.text });
      }
      const steps = await result.steps;
      const usageTotals = await result.totalUsage;
      toolNames = steps.flatMap((s) => s.toolCalls.map((c) => c.toolName));
      tokens = (usageTotals.inputTokens ?? 0) + (usageTotals.outputTokens ?? 0);
    } catch (err) {
      request.log.error({ err }, 'Planor IA: falha ao chamar o modelo');
      if (streaming) {
        send('error', { error: 'ai_unavailable', conversationId });
        reply.raw.end();
        return;
      }
      return reply.code(503).send({ error: 'ai_unavailable', conversationId });
    }
    text = text.trim();
    if (!text) text = 'Não consegui montar uma resposta agora. Tenta perguntar de outro jeito?';

    // O mesmo cartão da resposta anterior (pergunta de seguimento sobre a mesma coisa) não
    // aparece de novo.
    if (card && history.length > 0) {
      const [previous] = await db
        .select({ toolCalls: aiMessages.toolCalls })
        .from(aiMessages)
        .where(and(eq(aiMessages.conversationId, conversationId), eq(aiMessages.role, 'assistant')))
        .orderBy(desc(aiMessages.createdAt))
        .limit(1);
      const previousCard = (previous?.toolCalls as StoredExtras | null)?.card;
      if (previousCard && JSON.stringify(previousCard) === JSON.stringify(card)) card = null;
    }

    await db.insert(aiMessages).values({ conversationId, role: 'user', content: body.data.message });
    const [saved] = await db
      .insert(aiMessages)
      .values({
        conversationId,
        role: 'assistant',
        content: text,
        toolCalls: { card, tools: toolNames } satisfies StoredExtras,
        tokens,
      })
      .returning({ id: aiMessages.id, createdAt: aiMessages.createdAt });
    await db
      .insert(aiUsage)
      .values({ userId, month, questionsCount: 1 })
      .onConflictDoUpdate({
        target: [aiUsage.userId, aiUsage.month],
        set: { questionsCount: sql`${aiUsage.questionsCount} + 1` },
      });

    const response = {
      conversationId,
      message: {
        id: saved!.id,
        role: 'assistant',
        content: text,
        card,
        createdAt: saved!.createdAt.toISOString(),
      },
      usage: { ...usage, used: usage.used + 1 },
    };
    if (streaming) {
      send('done', response);
      reply.raw.end();
      return;
    }
    return response;
  });

  app.get('/ai/conversations', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const rows = await db
      .select({
        id: aiConversations.id,
        title: aiConversations.title,
        createdAt: aiConversations.createdAt,
        lastMessageAt: sql<Date | null>`(select max(${aiMessages.createdAt}) from ${aiMessages} where ${aiMessages.conversationId} = ${aiConversations.id})`,
      })
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.createdAt))
      .limit(50);
    // Prévia: a última resposta da IA de cada conversa.
    const previews = new Map<string, string>();
    if (rows.length > 0) {
      const replies = await db
        .select({ conversationId: aiMessages.conversationId, content: aiMessages.content })
        .from(aiMessages)
        .where(
          and(
            inArray(
              aiMessages.conversationId,
              rows.map((r) => r.id),
            ),
            eq(aiMessages.role, 'assistant'),
          ),
        )
        .orderBy(desc(aiMessages.createdAt));
      for (const reply of replies)
        if (!previews.has(reply.conversationId)) previews.set(reply.conversationId, reply.content);
    }
    return rows.map((r) => ({
      id: r.id,
      title: r.title ?? 'Conversa',
      preview: previews.get(r.id)?.slice(0, 90) ?? null,
      lastMessageAt: new Date(r.lastMessageAt ?? r.createdAt).toISOString(),
    }));
  });

  app.get('/ai/conversations/:id', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const { id } = request.params as { id: string };
    if (!z.string().uuid().safeParse(id).success)
      return reply.code(400).send({ error: 'invalid_id' });
    const [conversation] = await db
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.id, id), eq(aiConversations.userId, userId)));
    if (!conversation) return reply.code(404).send({ error: 'conversation_not_found' });
    const rows = await db
      .select()
      .from(aiMessages)
      .where(
        and(eq(aiMessages.conversationId, id), inArray(aiMessages.role, ['user', 'assistant'])),
      )
      .orderBy(asc(aiMessages.createdAt));
    return {
      id: conversation.id,
      title: conversation.title ?? 'Conversa',
      messages: rows.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        card: (m.toolCalls as StoredExtras | null)?.card ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  });
}
