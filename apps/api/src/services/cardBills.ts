// Fatura a pagar de cada cartão conectado — CONTEXTO.md §6.6 ("cards de fatura por cartão").
// Uma fonte só pros cards do Futuro, o plano da semana e a tela da fatura.
import { and, desc, eq, ne } from 'drizzle-orm';
import { accounts, cardStatements, connections, creditCards, institutions } from '@planor/db';
import { addMonthsToKey, cardBillToPay, type CardBillToPay, type ClosedCardBill } from '@planor/shared';
import { db } from '../lib/db';

export type CardBill = CardBillToPay & {
  accountId: string;
  bankName: string;
  closingDay: number;
  dueDay: number;
};

export function todayKeySaoPaulo(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
}

/** As datas de fatura do agregador são datas de calendário gravadas como meia-noite UTC: ler em
 * UTC, não no fuso de São Paulo (senão 19/10 vira 18/10). */
export function calendarDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Última fatura fechada do cartão, no formato do cálculo puro. */
export async function lastClosedBill(accountId: string): Promise<ClosedCardBill | null> {
  const [row] = await db.select().from(cardStatements).where(eq(cardStatements.accountId, accountId)).orderBy(desc(cardStatements.period)).limit(1);
  if (!row) return null;
  return {
    month: row.period,
    totalCents: row.totalCents,
    paidCents: row.paidCents,
    dueDateKey: calendarDateKey(row.dueDate),
  };
}

/** Cartões de conexões ativas que já sincronizaram a fatura. */
export async function cardBillsToPay(userId: string, todayKey = todayKeySaoPaulo()): Promise<CardBill[]> {
  const cards = await db
    .select({
      accountId: creditCards.accountId,
      bankName: institutions.name,
      openBillCents: creditCards.currentBillCents,
      closingDay: creditCards.closingDay,
      dueDay: creditCards.dueDay,
    })
    .from(creditCards)
    .innerJoin(accounts, eq(creditCards.accountId, accounts.id))
    .innerJoin(connections, eq(accounts.connectionId, connections.id))
    .innerJoin(institutions, eq(connections.institutionId, institutions.id))
    .where(and(eq(accounts.userId, userId), ne(connections.status, 'disconnected')));

  const result: CardBill[] = [];
  for (const card of cards) {
    if (card.openBillCents === null) continue;
    const lastClosed = await lastClosedBill(card.accountId);
    const closedUnpaidCents = lastClosed ? Math.max(0, lastClosed.totalCents - lastClosed.paidCents) : 0;
    const bill = cardBillToPay({
      lastClosed,
      summary: {
        openMonth: lastClosed ? addMonthsToKey(lastClosed.month, 1) : null,
        openBillCents: card.openBillCents,
        undetailedCents: 0,
        closedUnpaidCents,
      },
      dueDay: card.dueDay,
      todayKey,
    });
    result.push({ ...bill, accountId: card.accountId, bankName: card.bankName, closingDay: card.closingDay, dueDay: card.dueDay });
  }
  return result;
}
