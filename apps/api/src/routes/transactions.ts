// Transações, regras de categoria e resumo de gastos — CONTEXTO.md §6.3, §6.5, §8.
import { and, desc, eq, gte, ilike, inArray, isNotNull, lt, or } from 'drizzle-orm';
import { accounts, cardStatements, categories, categoryRules, monthlySummaries, transactions } from '@planor/db';
import { monthRangeSaoPaulo } from '@planor/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUserId } from '../lib/auth';
import { db } from '../lib/db';

function currentMonthSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  return `${year}-${month}`;
}

/** Data do post (timestamptz) → chave do dia em America/Sao_Paulo ("2026-10-04"), pra agrupar
 * a lista por dia sem embutir lógica de fuso no app. */
function postedAtDateKey(postedAt: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(postedAt);
}

/** "62,90" ou "62.9" → 6290. `null` se não for um número válido (texto de busca livre). */
function parseAmountQuery(q: string): number | null {
  const normalized = q.replace(/\./g, '').replace(',', '.').trim();
  if (!normalized || Number.isNaN(Number(normalized))) return null;
  return Math.round(Number(normalized) * 100);
}

const listQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  type: z.enum(['todas', 'saidas', 'entradas', 'parcelas']).optional(),
  q: z.string().optional(),
  accountIds: z.string().optional(),
  categoryIds: z.string().optional(),
  minCents: z.coerce.number().int().optional(),
  maxCents: z.coerce.number().int().optional(),
});

const patchTransactionSchema = z.object({
  categoryId: z.string().uuid().optional(),
  expenseKind: z.enum(['fixed', 'variable']).optional(),
  isHidden: z.boolean().optional(),
  note: z.string().max(280).nullable().optional(),
});

const createCategoryRuleSchema = z.object({
  matchType: z.enum(['merchant', 'keyword']),
  pattern: z.string().min(1).max(120),
  categoryId: z.string().uuid(),
  expenseKind: z.enum(['fixed', 'variable']).optional(),
});

export async function transactionRoutes(app: FastifyInstance) {
  app.get('/transactions', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_query', issues: parsed.error.issues });
    }
    const { month, type, q, accountIds, categoryIds, minCents, maxCents } = parsed.data;

    const { start, end } = monthRangeSaoPaulo(month ?? currentMonthSaoPaulo());
    const conditions = [eq(transactions.userId, userId), gte(transactions.postedAt, start), lt(transactions.postedAt, end)];

    if (type === 'saidas') conditions.push(lt(transactions.amountCents, 0));
    else if (type === 'entradas') conditions.push(gte(transactions.amountCents, 0));
    else if (type === 'parcelas') conditions.push(isNotNull(transactions.installmentPlanId));

    if (accountIds) conditions.push(inArray(transactions.accountId, accountIds.split(',')));
    if (categoryIds) conditions.push(inArray(transactions.categoryId, categoryIds.split(',')));

    if (q) {
      const amountQuery = parseAmountQuery(q);
      const textMatch = or(ilike(transactions.descriptionRaw, `%${q}%`), ilike(transactions.merchantName, `%${q}%`));
      conditions.push(amountQuery !== null ? or(textMatch, eq(transactions.amountCents, amountQuery))! : textMatch!);
    }

    const rows = await db
      .select({
        id: transactions.id,
        postedAt: transactions.postedAt,
        descriptionRaw: transactions.descriptionRaw,
        merchantName: transactions.merchantName,
        amountCents: transactions.amountCents,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        expenseKind: transactions.expenseKind,
        isHidden: transactions.isHidden,
        isInstallment: transactions.installmentPlanId,
        accountName: accounts.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .leftJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(and(...conditions))
      .orderBy(desc(transactions.postedAt));

    const filtered =
      minCents !== undefined || maxCents !== undefined
        ? rows.filter((r) => {
            const abs = Math.abs(r.amountCents);
            if (minCents !== undefined && abs < minCents) return false;
            if (maxCents !== undefined && abs > maxCents) return false;
            return true;
          })
        : rows;

    return filtered.map((r) => ({
      id: r.id,
      postedAt: r.postedAt.toISOString(),
      postedAtDateKey: postedAtDateKey(r.postedAt),
      descriptionRaw: r.descriptionRaw,
      merchantName: r.merchantName,
      amountCents: r.amountCents,
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      expenseKind: r.expenseKind,
      isHidden: r.isHidden,
      isInstallment: r.isInstallment !== null,
      accountName: r.accountName,
    }));
  });

  app.get('/transactions/:id', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const { id } = request.params as { id: string };

    const [row] = await db
      .select({
        id: transactions.id,
        postedAt: transactions.postedAt,
        descriptionRaw: transactions.descriptionRaw,
        merchantName: transactions.merchantName,
        amountCents: transactions.amountCents,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categorySource: transactions.categorySource,
        expenseKind: transactions.expenseKind,
        isHidden: transactions.isHidden,
        isInstallment: transactions.installmentPlanId,
        note: transactions.note,
        accountId: transactions.accountId,
        accountName: accounts.name,
        statementId: transactions.statementId,
        statementPeriod: cardStatements.period,
        statementDueDate: cardStatements.dueDate,
      })
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .leftJoin(accounts, eq(accounts.id, transactions.accountId))
      .leftJoin(cardStatements, eq(cardStatements.id, transactions.statementId))
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

    if (!row) return reply.code(404).send({ error: 'transaction_not_found' });

    return {
      id: row.id,
      postedAt: row.postedAt.toISOString(),
      descriptionRaw: row.descriptionRaw,
      merchantName: row.merchantName,
      amountCents: row.amountCents,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      categorySource: row.categorySource,
      expenseKind: row.expenseKind,
      isHidden: row.isHidden,
      isInstallment: row.isInstallment !== null,
      note: row.note,
      accountName: row.accountName,
      statement: row.statementId
        ? { period: row.statementPeriod, dueDate: row.statementDueDate?.toISOString() ?? null }
        : null,
    };
  });

  app.patch('/transactions/:id', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const { id } = request.params as { id: string };
    const parsed = patchTransactionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.issues });
    }
    if (Object.keys(parsed.data).length === 0) {
      return reply.code(400).send({ error: 'empty_body' });
    }

    const patch = parsed.data.categoryId ? { ...parsed.data, categorySource: 'manual' as const } : parsed.data;

    const [updated] = await db
      .update(transactions)
      .set(patch)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();

    if (!updated) return reply.code(404).send({ error: 'transaction_not_found' });
    return updated;
  });

  app.post('/category-rules', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const parsed = createCategoryRuleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.issues });
    }

    const [created] = await db
      .insert(categoryRules)
      .values({ userId, ...parsed.data })
      .returning();

    return reply.code(201).send(created);
  });

  // Lê de `monthly_summaries` — o mesmo agregado pré-calculado que o `/home` usa (CONTEXTO.md:
  // "Agregados mensais recalculados pelo pipeline... alimentam telas e a IA sem reprocessar
  // transações"). `categories.default_kind` dá o fixo/variável de cada categoria.
  app.get('/spending/summary', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const month = (request.query as { month?: string }).month ?? currentMonthSaoPaulo();

    const [summary] = await db
      .select()
      .from(monthlySummaries)
      .where(eq(monthlySummaries.userId, userId));

    const byCategory = (summary?.byCategory as Record<string, number> | undefined) ?? {};
    const categoryIds = Object.keys(byCategory);

    const categoryRows = categoryIds.length
      ? await db.select().from(categories).where(inArray(categories.id, categoryIds))
      : [];
    const categoryById = new Map(categoryRows.map((c) => [c.id, c]));

    const totalCents = summary?.spentCents ?? 0;
    const categoryList = categoryIds
      .map((categoryId) => {
        const amountCents = byCategory[categoryId] ?? 0;
        const category = categoryById.get(categoryId);
        return {
          categoryId,
          name: category?.name ?? 'Outros',
          amountCents,
          kind: category?.defaultKind ?? 'variable',
          pctOfTotal: totalCents > 0 ? Math.round((amountCents / totalCents) * 100) : 0,
        };
      })
      .sort((a, b) => b.amountCents - a.amountCents);

    return {
      month: summary?.month ?? month,
      totalCents,
      categoriesCount: categoryList.length,
      trendVsLastMonthPct: null,
      fixedCents: summary?.fixedCents ?? 0,
      variableCents: summary?.variableCents ?? 0,
      fixedPct: summary && summary.fixedCents + summary.variableCents > 0
        ? Math.round((summary.fixedCents / (summary.fixedCents + summary.variableCents)) * 100)
        : 0,
      variablePct: summary && summary.fixedCents + summary.variableCents > 0
        ? Math.round((summary.variableCents / (summary.fixedCents + summary.variableCents)) * 100)
        : 0,
      categories: categoryList,
    };
  });

  app.get('/spending/category/:id', async (_req, reply) =>
    reply.code(501).send({ error: 'not_implemented', note: 'Detalhe da categoria — adiado até existir histórico de vários meses (ver PROGRESSO.md).' }),
  );
}
