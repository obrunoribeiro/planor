// Linha do tempo, parcelas, assinaturas e fixos — CONTEXTO.md §6.6, §8.
import { and, desc, eq, inArray, isNotNull, ne } from 'drizzle-orm';
import { accounts, committedByMonth, connections, creditCards, installmentPlans, institutions, recurrences, transactions } from '@planor/db';
import { installmentPlanProgress, latestPriceChange, monthAbbrevPtBR, monthKeySaoPaulo, monthNamePtBR, nextDueDateKey } from '@planor/shared';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { requireUserId } from '../lib/auth';
import { db } from '../lib/db';
import { enqueueProcessTransactions } from '../jobs/queue';
import { notImplemented } from '../lib/stub';

export async function futureRoutes(app: FastifyInstance) {
  // Uma rota só pra tudo que a tela "Futuro" mostra (mesmo padrão do `/home`) — as rotas de
  // detalhe por item (`/future/installments` etc.) continuam Fase 3, essa aqui é só o resumo.
  app.get('/future/timeline', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const committedRows = await db
      .select()
      .from(committedByMonth)
      .where(eq(committedByMonth.userId, userId))
      .orderBy(committedByMonth.month);

    const months = committedRows.map((row, index) => ({
      label: monthAbbrevPtBR(row.month),
      amountCents: row.installmentsCents + row.subscriptionsCents + row.billsCents,
      active: index === 0,
    }));
    const totalCents = months.reduce((sum, m) => sum + m.amountCents, 0);
    const current = committedRows[0];

    const plans = await db.select().from(installmentPlans).where(eq(installmentPlans.userId, userId));
    const activeSubscriptions = await db
      .select()
      .from(recurrences)
      .where(and(eq(recurrences.userId, userId), eq(recurrences.kind, 'subscription'), eq(recurrences.status, 'active')));
    const bills = await db
      .select()
      .from(recurrences)
      .where(and(eq(recurrences.userId, userId), eq(recurrences.kind, 'recurring_bill'), eq(recurrences.status, 'active')));

    const billNames = bills.map((b) => b.merchantName);
    const billsDescription =
      billNames.length <= 2
        ? billNames.join(' e ')
        : `${billNames.slice(0, 2).join(', ')} e mais ${billNames.length - 2}`;

    // Fatura aberta de cada cartão conectado (`credit_cards.current_bill_cents`, calculada na
    // sincronização). A sincronização ainda não grava `card_statements`; o vencimento sai do dia
    // de vencimento do cartão.
    const cards = await db
      .select({
        bankName: institutions.name,
        totalCents: creditCards.currentBillCents,
        dueDay: creditCards.dueDay,
      })
      .from(creditCards)
      .innerJoin(accounts, eq(creditCards.accountId, accounts.id))
      .innerJoin(connections, eq(accounts.connectionId, connections.id))
      .innerJoin(institutions, eq(connections.institutionId, institutions.id))
      .where(and(eq(accounts.userId, userId), ne(connections.status, 'disconnected'), isNotNull(creditCards.currentBillCents)));
    const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
    const statements = cards.map((card) => ({ bankName: card.bankName, totalCents: card.totalCents!, dueDate: nextDueDateKey(card.dueDay, todayKey) }));

    const lastMonthKey = committedRows.at(-1)?.month;

    return {
      committed: {
        untilLabel: lastMonthKey ? monthNamePtBR(lastMonthKey) : null,
        totalCents,
        months,
      },
      currentMonth: current
        ? {
            label: monthNamePtBR(current.month),
            totalCents: current.installmentsCents + current.subscriptionsCents + current.billsCents,
            installments: { count: plans.length, amountCents: current.installmentsCents },
            subscriptions: { count: activeSubscriptions.length, amountCents: current.subscriptionsCents },
            bills: { description: billsDescription || 'Nenhum fixo recorrente', amountCents: current.billsCents },
          }
        : null,
      statements: statements.map((s) => ({
        bank: s.bankName,
        amountCents: s.totalCents,
        dueDate: s.dueDate,
      })),
    };
  });

  // Parcelas (§6.6): resumo (por mês, falta pagar, último mês) + cada parcelamento ativo com o
  // progresso. O detalhe do parcelamento usa esta mesma lista (não tem rota própria).
  app.get('/future/installments', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const referenceMonth = monthKeySaoPaulo(new Date());
    const rows = await db
      .select({
        id: installmentPlans.id,
        merchantName: installmentPlans.merchantName,
        installmentCents: installmentPlans.installmentCents,
        totalCents: installmentPlans.totalCents,
        count: installmentPlans.count,
        current: installmentPlans.current,
        firstDate: installmentPlans.firstDate,
        lastDate: installmentPlans.lastDate,
        bank: institutions.name,
        dueDay: creditCards.dueDay,
      })
      .from(installmentPlans)
      .innerJoin(accounts, eq(accounts.id, installmentPlans.accountId))
      .innerJoin(connections, eq(connections.id, accounts.connectionId))
      .innerJoin(institutions, eq(institutions.id, connections.institutionId))
      .leftJoin(creditCards, eq(creditCards.accountId, accounts.id))
      .where(eq(installmentPlans.userId, userId));

    const plans = rows
      .map((row) => {
        const progress = installmentPlanProgress(row, referenceMonth, row.dueDay);
        return {
          id: row.id,
          merchantName: row.merchantName,
          bank: row.bank,
          installmentCents: row.installmentCents,
          totalCents: row.totalCents,
          count: row.count,
          current: row.current,
          firstMonth: row.firstDate.slice(0, 7),
          lastMonth: row.lastDate.slice(0, 7),
          ...progress,
        };
      })
      // Como no Figma (30:592): quem termina por último primeiro.
      .sort((a, b) => b.lastMonth.localeCompare(a.lastMonth) || b.installmentCents - a.installmentCents);

    return {
      monthlyCents: plans.reduce((sum, p) => sum + p.installmentCents, 0),
      remainingCents: plans.reduce((sum, p) => sum + p.remainingCents, 0),
      lastMonth: plans.reduce<string | null>((latest, p) => (!latest || p.lastMonth > latest ? p.lastMonth : latest), null),
      plans,
    };
  });
  // Assinaturas (§6.6): totais por mês/ano, as marcadas como sem uso e cada assinatura com o que o
  // detalhe mostra. As canceladas pelo usuário vêm junto (status), fora dos totais.
  app.get('/future/subscriptions', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const rows = await db
      .select()
      .from(recurrences)
      .where(and(eq(recurrences.userId, userId), eq(recurrences.kind, 'subscription'), ne(recurrences.status, 'ended')));
    const ids = rows.map((r) => r.id);

    // "Cartão" = banco da cobrança mais recente; "Pago em [ano]" = soma das cobranças do ano.
    const yearStart = new Date(`${monthKeySaoPaulo(new Date()).slice(0, 4)}-01-01T03:00:00Z`);
    const charges = ids.length
      ? await db
          .select({ recurrenceId: transactions.recurrenceId, amountCents: transactions.amountCents, postedAt: transactions.postedAt, bank: institutions.name })
          .from(transactions)
          .innerJoin(accounts, eq(accounts.id, transactions.accountId))
          .innerJoin(connections, eq(connections.id, accounts.connectionId))
          .innerJoin(institutions, eq(institutions.id, connections.institutionId))
          .where(inArray(transactions.recurrenceId, ids))
          .orderBy(desc(transactions.postedAt))
      : [];

    const items = rows.map((r) => {
      const own = charges.filter((c) => c.recurrenceId === r.id);
      const history = (r.priceHistory as { amountCents: number; at: string }[]) ?? [];
      return {
        id: r.id,
        merchantName: r.merchantName,
        amountCents: r.amountCents,
        nextChargeAt: r.nextChargeAt?.toISOString() ?? null,
        usage: r.usage,
        status: r.status,
        cancelledAt: r.cancelledAt?.toISOString() ?? null,
        bank: own[0]?.bank ?? null,
        since: history[0]?.at ?? null,
        paidThisYearCents: own.filter((c) => c.postedAt >= yearStart).reduce((sum, c) => sum - c.amountCents, 0),
        priceChange: latestPriceChange(history),
      };
    });

    const active = items.filter((i) => i.status === 'active');
    const monthlyCents = active.reduce((sum, i) => sum + i.amountCents, 0);
    const unused = active.filter((i) => i.usage === 'none');
    return {
      monthlyCents,
      yearlyCents: monthlyCents * 12,
      unused: { count: unused.length, monthlyCents: unused.reduce((sum, i) => sum + i.amountCents, 0) },
      items,
    };
  });
  app.get('/future/bills', async (_req, reply) => notImplemented(reply, 'Fixos recorrentes — Fase 3 (§6.6)'));
  app.get('/future/statements/:id', async (_req, reply) => notImplemented(reply, 'Fatura do cartão — Fase 3 (§6.6)'));
  // "Você usa esse serviço?" e "Já cancelei" / desfazer (§6.6). O lembrete de 3 dias antes da
  // cobrança fica pra quando existir push (§6.9) — ver PROGRESSO.md.
  const subscriptionPatch = z.object({
    usage: z.enum(['high', 'low', 'none', 'unknown']).optional(),
    status: z.enum(['active', 'cancelled_by_user']).optional(),
  });
  app.patch('/subscriptions/:id', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const { id } = request.params as { id: string };
    const body = subscriptionPatch.safeParse(request.body);
    if (!body.success || (!body.data.usage && !body.data.status)) return reply.code(400).send({ error: 'invalid_request' });

    const [current] = await db.select().from(recurrences).where(and(eq(recurrences.id, id), eq(recurrences.userId, userId)));
    if (!current) return reply.code(404).send({ error: 'subscription_not_found' });

    const statusChanged = body.data.status !== undefined && body.data.status !== current.status;
    const [updated] = await db
      .update(recurrences)
      .set({
        ...(body.data.usage ? { usage: body.data.usage } : {}),
        ...(statusChanged ? { status: body.data.status, cancelledAt: body.data.status === 'cancelled_by_user' ? new Date() : null } : {}),
      })
      .where(eq(recurrences.id, id))
      .returning();

    // Cancelar/desfazer muda o comprometido e o "a vencer" — recalcula no job.
    if (statusChanged) await enqueueProcessTransactions(userId);
    return { id: updated!.id, usage: updated!.usage, status: updated!.status };
  });
}
