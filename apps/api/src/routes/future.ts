// Linha do tempo, parcelas, assinaturas e fixos — CONTEXTO.md §6.6, §8.
import { and, eq, isNotNull, ne } from 'drizzle-orm';
import { accounts, committedByMonth, connections, creditCards, installmentPlans, institutions, recurrences } from '@planor/db';
import { installmentPlanProgress, monthAbbrevPtBR, monthKeySaoPaulo, monthNamePtBR, nextDueDateKey } from '@planor/shared';
import type { FastifyInstance } from 'fastify';
import { requireUserId } from '../lib/auth';
import { db } from '../lib/db';
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
  app.get('/future/subscriptions', async (_req, reply) => notImplemented(reply, 'Assinaturas — Fase 3 (§6.6)'));
  app.get('/future/bills', async (_req, reply) => notImplemented(reply, 'Fixos recorrentes — Fase 3 (§6.6)'));
  app.get('/future/statements/:id', async (_req, reply) => notImplemented(reply, 'Fatura do cartão — Fase 3 (§6.6)'));
  app.patch('/subscriptions/:id', async (_req, reply) =>
    notImplemented(reply, 'Uso, cancelada, lembrete — Fase 3 (§6.6)'),
  );
}
