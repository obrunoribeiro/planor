// "Compras ainda não detalhadas pelo banco" — parte da fatura aberta que o banco ainda não mandou
// como transação (`credit_cards.undetailed_cents`, calculada na sincronização). Entra no gasto do
// mês corrente da Home e de Gastos; decisão do Bruno em 2026-10-10 (ver PROGRESSO.md).
import { and, eq, ne, sql } from 'drizzle-orm';
import { accounts, connections, creditCards } from '@planor/db';
import { db } from '../lib/db';

export async function undetailedSpendingCents(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${creditCards.undetailedCents}), 0)::int` })
    .from(creditCards)
    .innerJoin(accounts, eq(accounts.id, creditCards.accountId))
    .innerJoin(connections, eq(connections.id, accounts.connectionId))
    .where(and(eq(accounts.userId, userId), ne(connections.status, 'disconnected')));
  return row?.total ?? 0;
}
