// Transações, regras de categoria e resumo de gastos — CONTEXTO.md §6.3, §6.5, §8.
import { eq, inArray } from 'drizzle-orm';
import { categories, monthlySummaries } from '@planor/db';
import type { FastifyInstance } from 'fastify';
import { requireUserId } from '../lib/auth';
import { db } from '../lib/db';
import { notImplemented } from '../lib/stub';

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

export async function transactionRoutes(app: FastifyInstance) {
  app.get('/transactions', async (_req, reply) => notImplemented(reply, 'Lista com filtros — Fase 2 (§6.5)'));
  app.get('/transactions/:id', async (_req, reply) => notImplemented(reply, 'Detalhe — Fase 2 (§6.5)'));
  app.patch('/transactions/:id', async (_req, reply) =>
    notImplemented(reply, 'Mudar categoria/tipo/ocultar/nota — Fase 2 (§6.5)'),
  );
  app.post('/category-rules', async (_req, reply) =>
    notImplemented(reply, '"Aplicar a compras parecidas" vira regra — Fase 2 (§6.3, §6.5)'),
  );

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
    notImplemented(reply, 'Detalhe da categoria — Fase 2 (§6.5)'),
  );
}
