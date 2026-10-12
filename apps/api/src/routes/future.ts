// Linha do tempo, parcelas, assinaturas e fixos — CONTEXTO.md §6.6, §8.
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { accounts, cardStatements, committedByMonth, connections, creditCards, installmentPlans, institutions, manualRecurringBills, recurrences, transactions } from '@planor/db';
import { addMonthsToKey, billClosingDateKey, dayInMonthKey, installmentPlanProgress, latestPriceChange, monthAbbrevPtBR, monthKeySaoPaulo, monthNamePtBR } from '@planor/shared';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { requireUserId } from '../lib/auth';
import { db } from '../lib/db';
import { enqueueProcessTransactions } from '../jobs/queue';
import { calendarDateKey, cardBillsToPay, lastClosedBill, todayKeySaoPaulo } from '../services/cardBills';

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

    const manualBills = await db.select().from(manualRecurringBills).where(eq(manualRecurringBills.userId, userId));
    const billNames = [...bills.map((b) => b.merchantName), ...manualBills.map((b) => b.name)];
    const billsDescription =
      billNames.length <= 2
        ? billNames.join(' e ')
        : `${billNames.slice(0, 2).join(', ')} e mais ${billNames.length - 2}`;

    // A fatura a pagar de cada cartão: a fechada enquanto falta pagar, depois a aberta.
    const statements = await cardBillsToPay(userId);

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
        accountId: s.accountId,
        bank: s.bankName,
        amountCents: s.amountCents,
        dueDate: s.dueDateKey,
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
  // Fixos recorrentes (§6.6): os detectados nas transações (`recurrences`, recurring_bill) + os
  // cadastrados à mão em "Nova conta fixa" (`manual_recurring_bills`).
  app.get('/future/bills', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;

    const [detected, manual] = await Promise.all([
      db
        .select()
        .from(recurrences)
        .where(and(eq(recurrences.userId, userId), eq(recurrences.kind, 'recurring_bill'), eq(recurrences.status, 'active'))),
      db.select().from(manualRecurringBills).where(eq(manualRecurringBills.userId, userId)),
    ]);

    // "Pago com" dos detectados = banco da cobrança mais recente.
    const ids = detected.map((d) => d.id);
    const charges = ids.length
      ? await db
          .select({ recurrenceId: transactions.recurrenceId, bank: institutions.name })
          .from(transactions)
          .innerJoin(accounts, eq(accounts.id, transactions.accountId))
          .innerJoin(connections, eq(connections.id, accounts.connectionId))
          .innerJoin(institutions, eq(institutions.id, connections.institutionId))
          .where(inArray(transactions.recurrenceId, ids))
          .orderBy(desc(transactions.postedAt))
      : [];
    const dayOf = (date: Date) => Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', day: '2-digit' }).format(date));

    const items = [
      ...detected.map((d) => ({
        id: d.id,
        source: 'detected' as const,
        name: d.merchantName,
        amountCents: d.amountCents,
        day: d.nextChargeAt ? dayOf(d.nextChargeAt) : null,
        paidWith: charges.find((c) => c.recurrenceId === d.id)?.bank ?? null,
        estimated: d.estimated,
      })),
      ...manual.map((m) => ({
        id: m.id,
        source: 'manual' as const,
        name: m.name,
        amountCents: m.amountCents,
        day: m.day,
        paidWith: m.paidWith,
        estimated: false,
      })),
    ].sort((a, b) => (a.day ?? 99) - (b.day ?? 99));

    return {
      nextMonth: addMonthsToKey(monthKeySaoPaulo(new Date()), 1),
      monthlyCents: items.reduce((sum, i) => sum + i.amountCents, 0),
      items,
    };
  });

  const newBill = z.object({
    name: z.string().trim().min(1).max(60),
    amountCents: z.number().int().positive(),
    day: z.number().int().min(1).max(31),
    paidWith: z.string().trim().max(60).nullable().optional(),
  });
  app.post('/future/bills', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const body = newBill.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_request' });

    const [created] = await db
      .insert(manualRecurringBills)
      .values({ userId, name: body.data.name, amountCents: body.data.amountCents, day: body.data.day, paidWith: body.data.paidWith ?? null })
      .returning();
    await enqueueProcessTransactions(userId); // recalcula o comprometido
    return reply.code(201).send({ id: created!.id });
  });

  // Só conta cadastrada à mão; as detectadas saem sozinhas quando param de cobrar.
  app.delete('/future/bills/:id', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const { id } = request.params as { id: string };
    const [deleted] = await db
      .delete(manualRecurringBills)
      .where(and(eq(manualRecurringBills.id, id), eq(manualRecurringBills.userId, userId)))
      .returning({ id: manualRecurringBills.id });
    if (!deleted) return reply.code(404).send({ error: 'bill_not_found' });
    await enqueueProcessTransactions(userId);
    return reply.code(204).send();
  });
  // Fatura do cartão (§6.6): `:id` é a conta do cartão; `?month=YYYY-MM` (mês do vencimento)
  // escolhe a fatura — sem ele, a que o usuário tem que pagar a seguir (a mesma do card do Futuro).
  // Quebra os lançamentos da fatura em parcelas, assinaturas, fixos e outras compras; o que o banco
  // ainda não detalhou aparece separado, sem inventar categoria.
  app.get('/future/statements/:id', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const { id } = request.params as { id: string };
    const query = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() }).safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: 'invalid_request' });

    const todayKey = todayKeySaoPaulo();
    const card = (await cardBillsToPay(userId, todayKey)).find((c) => c.accountId === id);
    if (!card) return reply.code(404).send({ error: 'card_not_found' });
    const month = query.data.month ?? card.month;

    const [[statement], [cardRow]] = await Promise.all([
      db.select().from(cardStatements).where(and(eq(cardStatements.accountId, id), eq(cardStatements.period, month))),
      db.select().from(creditCards).where(eq(creditCards.accountId, id)),
    ]);
    const lastClosed = await lastClosedBill(id);
    const openMonth = lastClosed ? addMonthsToKey(lastClosed.month, 1) : card.kind === 'open' ? card.month : null;
    const kind: 'closed' | 'open' | 'future' = statement ? 'closed' : month === openMonth ? 'open' : 'future';

    const rows = await db
      .select({
        amountCents: transactions.amountCents,
        merchantName: transactions.merchantName,
        installmentNumber: transactions.installmentNumber,
        installmentCount: transactions.installmentCount,
        planName: installmentPlans.merchantName,
        recurrenceKind: recurrences.kind,
        recurrenceName: recurrences.merchantName,
        usage: recurrences.usage,
      })
      .from(transactions)
      .leftJoin(installmentPlans, eq(installmentPlans.id, transactions.installmentPlanId))
      .leftJoin(recurrences, eq(recurrences.id, transactions.recurrenceId))
      .where(and(eq(transactions.accountId, id), eq(transactions.userId, userId), eq(transactions.billMonth, month), eq(transactions.isHidden, false)));
    // Só gastos: o pagamento da fatura anterior cai nesta fatura como crédito e não é compra.
    const spends = rows.filter((r) => r.amountCents < 0).map((r) => ({ ...r, cents: -r.amountCents }));

    const installmentRows = spends.filter((r) => (r.installmentCount ?? 0) > 1);
    const subscriptionRows = spends.filter((r) => !installmentRows.includes(r) && r.recurrenceKind === 'subscription');
    const billRows = spends.filter((r) => !installmentRows.includes(r) && r.recurrenceKind === 'recurring_bill');
    const otherRows = spends.filter((r) => !installmentRows.includes(r) && !r.recurrenceKind);
    const sum = (list: { cents: number }[]) => list.reduce((total, r) => total + r.cents, 0);
    const detailedCents = sum(spends);

    const totalCents = kind === 'closed' ? statement!.totalCents : kind === 'open' ? (cardRow?.currentBillCents ?? detailedCents) : detailedCents;
    const undetailedCents = kind === 'open' ? (cardRow?.undetailedCents ?? 0) : kind === 'closed' ? Math.max(0, totalCents - detailedCents) : 0;

    const closingDate = statement ? calendarDateKey(statement.closingDate) : billClosingDateKey(month, card.closingDay, card.dueDay);
    const dueDate = statement ? calendarDateKey(statement.dueDate) : dayInMonthKey(month, card.dueDay);

    return {
      accountId: id,
      bank: card.bankName,
      month,
      kind,
      paid: statement ? statement.paidCents >= statement.totalCents : false,
      totalCents,
      closingDate,
      dueDate,
      installments: {
        totalCents: sum(installmentRows),
        items: installmentRows
          .sort((a, b) => b.cents - a.cents)
          .map((r) => ({
            name: r.planName ?? r.merchantName ?? 'Parcela',
            number: r.installmentNumber,
            count: r.installmentCount,
            amountCents: r.cents,
          })),
      },
      subscriptions: {
        totalCents: sum(subscriptionRows),
        count: subscriptionRows.length,
        unusedCount: subscriptionRows.filter((r) => r.usage === 'none').length,
      },
      bills: {
        totalCents: sum(billRows),
        items: billRows.map((r) => ({ name: r.recurrenceName ?? r.merchantName ?? 'Conta fixa', amountCents: r.cents })),
      },
      otherPurchases: { totalCents: sum(otherRows), count: otherRows.length },
      undetailedCents,
    };
  });
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
