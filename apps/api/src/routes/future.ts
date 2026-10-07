// Linha do tempo, parcelas, assinaturas e fixos — CONTEXTO.md §6.6, §8.
import { and, eq } from 'drizzle-orm';
import { accounts, cardStatements, committedByMonth, connections, installmentPlans, institutions, recurrences } from '@planor/db';
import { monthAbbrevPtBR, monthNamePtBR } from '@planor/shared';
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

    const statements = await db
      .select({
        bankName: institutions.name,
        totalCents: cardStatements.totalCents,
        dueDate: cardStatements.dueDate,
      })
      .from(cardStatements)
      .innerJoin(accounts, eq(cardStatements.accountId, accounts.id))
      .innerJoin(connections, eq(accounts.connectionId, connections.id))
      .innerJoin(institutions, eq(connections.institutionId, institutions.id))
      .where(and(eq(accounts.userId, userId), eq(cardStatements.status, 'open')));

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
        dueDate: s.dueDate.toISOString().slice(0, 10),
      })),
    };
  });

  app.get('/future/installments', async (_req, reply) => notImplemented(reply, 'Parcelas — Fase 3 (§6.6)'));
  app.get('/future/subscriptions', async (_req, reply) => notImplemented(reply, 'Assinaturas — Fase 3 (§6.6)'));
  app.get('/future/bills', async (_req, reply) => notImplemented(reply, 'Fixos recorrentes — Fase 3 (§6.6)'));
  app.get('/future/statements/:id', async (_req, reply) => notImplemented(reply, 'Fatura do cartão — Fase 3 (§6.6)'));
  app.patch('/subscriptions/:id', async (_req, reply) =>
    notImplemented(reply, 'Uso, cancelada, lembrete — Fase 3 (§6.6)'),
  );
}
