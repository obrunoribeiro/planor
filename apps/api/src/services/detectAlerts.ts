// Job `detect-alerts` (CONTEXTO.md §9: "após o processamento e diariamente às 8h"). Grava na
// tabela `alerts` o que a central (§6.9) mostra; as regras moram em
// `packages/shared/src/calculations/alerts.ts`. Cada alerta tem uma chave no payload pra não
// repetir (a transação, a categoria no mês, o reajuste, a fatura do mês).
//
// Tipos daqui: `unusual_spend` (compra e categoria — §6.3, passo 7), `subscription_price_up` e
// `statement_closing`. `consent_expiring`, `sync_failed`, `bank_disconnected` e
// `subscription_charged_after_cancel` são gravados por quem detecta (conexões e pipeline).
import { and, eq, gte, inArray, isNotNull, lt, lte, or, isNull, sql } from 'drizzle-orm';
import {
  alerts,
  categories,
  goals,
  creditCards,
  monthlySummaries,
  recurrences,
  transactions,
  accounts,
} from '@planor/db';
import {
  addMonthsToKey,
  billClosingDateKey,
  categoriesAheadOfPace,
  categoryLimitStatus,
  duplicateCharges,
  lastMonthKeys,
  latestPriceChange,
  monthlyAverageCents,
  monthKeySaoPaulo,
  monthRangeSaoPaulo,
  previousMonthKey,
  unusualPurchases,
} from '@planor/shared';
import { db } from '../lib/db';
import { cardBillsToPay, lastClosedBill, todayKeySaoPaulo } from './cardBills';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Só compras recentes viram alerta — a primeira rodada não pode despejar o histórico inteiro. */
const RECENT_PURCHASE_DAYS = 3;
/** Reajuste mais antigo que isso já não é novidade. */
const RECENT_PRICE_CHANGE_DAYS = 35;
/** "Fatura fecha em 3 dias" (§6.9). */
const STATEMENT_CLOSING_DAYS = 3;

async function existingKeys(userId: string, type: string, key: string): Promise<Set<string>> {
  const rows = await db
    .select({ value: sql<string>`${alerts.payload}->>${key}` })
    .from(alerts)
    .where(and(eq(alerts.userId, userId), eq(alerts.type, type)));
  return new Set(rows.map((r) => r.value).filter(Boolean));
}

function daysBetweenKeys(fromKey: string, toKey: string): number {
  return Math.round(
    (Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / DAY_MS,
  );
}

async function detectUnusualPurchases(userId: string, now: Date) {
  const month = monthKeySaoPaulo(now);
  const historyStart = monthRangeSaoPaulo(lastMonthKeys(previousMonthKey(month), 3)[0]!).start;
  const recentStart = new Date(now.getTime() - RECENT_PURCHASE_DAYS * DAY_MS);
  const purchase = and(
    eq(transactions.userId, userId),
    eq(transactions.isHidden, false),
    eq(transactions.isTransfer, false),
    lt(transactions.amountCents, 0),
    isNotNull(transactions.categoryId),
    // Parcela é compromisso já conhecido, não gasto novo.
    or(isNull(transactions.installmentCount), lte(transactions.installmentCount, 1)),
  );

  const [recent, history, alerted] = await Promise.all([
    db
      .select({
        id: transactions.id,
        categoryId: transactions.categoryId,
        amountCents: transactions.amountCents,
        merchantName: transactions.merchantName,
        categoryName: categories.name,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(
        and(purchase, gte(transactions.postedAt, recentStart), lte(transactions.postedAt, now)),
      ),
    db
      .select({ categoryId: transactions.categoryId, amountCents: transactions.amountCents })
      .from(transactions)
      .where(
        and(
          purchase,
          gte(transactions.postedAt, historyStart),
          lt(transactions.postedAt, monthRangeSaoPaulo(month).start),
        ),
      ),
    existingKeys(userId, 'unusual_spend', 'transactionId'),
  ]);

  const flagged = unusualPurchases({
    candidates: recent
      .filter((r) => !alerted.has(r.id))
      .map((r) => ({ id: r.id, categoryId: r.categoryId!, amountCents: -r.amountCents })),
    history: history.map((h) => ({ categoryId: h.categoryId!, amountCents: -h.amountCents })),
  });
  const byId = new Map(recent.map((r) => [r.id, r]));
  return flagged.map((f) => ({
    userId,
    type: 'unusual_spend',
    payload: {
      kind: 'purchase',
      transactionId: f.id,
      merchantName: byId.get(f.id)?.merchantName ?? null,
      categoryName: byId.get(f.id)?.categoryName ?? null,
      amountCents: f.amountCents,
      averageCents: f.averageCents,
    },
  }));
}

async function detectCategoryPace(userId: string, now: Date) {
  const todayKey = todayKeySaoPaulo(now);
  const month = todayKey.slice(0, 7);
  const previous = lastMonthKeys(previousMonthKey(month), 3);
  const [summaries, categoryRows, alerted] = await Promise.all([
    db
      .select({ month: monthlySummaries.month, byCategory: monthlySummaries.byCategory })
      .from(monthlySummaries)
      .where(
        and(
          eq(monthlySummaries.userId, userId),
          inArray(monthlySummaries.month, [month, ...previous]),
        ),
      ),
    db
      .select({ id: categories.id, name: categories.name, kind: categories.defaultKind })
      .from(categories)
      .where(or(isNull(categories.userId), eq(categories.userId, userId))),
    existingKeys(userId, 'unusual_spend', 'paceKey'),
  ]);
  const byMonth = new Map(
    summaries.map((s) => [s.month, (s.byCategory as Record<string, number>) ?? {}]),
  );
  const current = byMonth.get(month) ?? {};

  const ahead = categoriesAheadOfPace({
    dayOfMonth: Number(todayKey.slice(8, 10)),
    categories: categoryRows.map((c) => ({
      categoryId: c.id,
      name: c.name,
      kind: c.kind,
      monthToDateCents: current[c.id] ?? 0,
      averageMonthlyCents: monthlyAverageCents(
        previous.map((m) => ({
          amountCents: byMonth.get(m)?.[c.id] ?? 0,
          hasData: byMonth.has(m),
        })),
      ),
    })),
  });
  return ahead
    .filter((c) => !alerted.has(`${c.categoryId}:${month}`))
    .map((c) => ({
      userId,
      type: 'unusual_spend',
      payload: {
        kind: 'category',
        paceKey: `${c.categoryId}:${month}`,
        categoryId: c.categoryId,
        categoryName: c.name,
        monthToDateCents: c.monthToDateCents,
        averageMonthlyCents: c.averageMonthlyCents,
      },
    }));
}

async function detectPriceUps(userId: string, now: Date) {
  const [subscriptions, alerted] = await Promise.all([
    db
      .select({
        id: recurrences.id,
        merchantName: recurrences.merchantName,
        priceHistory: recurrences.priceHistory,
      })
      .from(recurrences)
      .where(
        and(
          eq(recurrences.userId, userId),
          eq(recurrences.kind, 'subscription'),
          eq(recurrences.status, 'active'),
        ),
      ),
    existingKeys(userId, 'subscription_price_up', 'priceKey'),
  ]);
  return subscriptions.flatMap((s) => {
    const change = latestPriceChange(s.priceHistory as { amountCents: number; at: string }[]);
    if (!change || change.pct <= 0) return [];
    if (now.getTime() - new Date(change.at).getTime() > RECENT_PRICE_CHANGE_DAYS * DAY_MS)
      return [];
    const priceKey = `${s.id}:${change.toCents}`;
    if (alerted.has(priceKey)) return [];
    return [
      {
        userId,
        type: 'subscription_price_up',
        payload: {
          priceKey,
          recurrenceId: s.id,
          merchantName: s.merchantName,
          fromCents: change.fromCents,
          toCents: change.toCents,
        },
      },
    ];
  });
}

async function detectStatementClosing(userId: string, now: Date) {
  const todayKey = todayKeySaoPaulo(now);
  const [cards, alerted] = await Promise.all([
    db
      .select({
        accountId: creditCards.accountId,
        closingDay: creditCards.closingDay,
        dueDay: creditCards.dueDay,
        openBillCents: creditCards.currentBillCents,
        accountName: accounts.name,
      })
      .from(creditCards)
      .innerJoin(accounts, eq(accounts.id, creditCards.accountId))
      .where(eq(accounts.userId, userId)),
    existingKeys(userId, 'statement_closing', 'statementKey'),
  ]);
  const bankByAccount = new Map(
    (await cardBillsToPay(userId, todayKey)).map((b) => [b.accountId, b.bankName]),
  );

  const result = [];
  for (const card of cards) {
    if (card.openBillCents === null || !bankByAccount.has(card.accountId)) continue;
    const lastClosed = await lastClosedBill(card.accountId);
    if (!lastClosed) continue;
    const openMonth = addMonthsToKey(lastClosed.month, 1);
    const closingKey = billClosingDateKey(openMonth, card.closingDay, card.dueDay);
    const daysLeft = daysBetweenKeys(todayKey, closingKey);
    const statementKey = `${card.accountId}:${openMonth}`;
    if (daysLeft < 0 || daysLeft > STATEMENT_CLOSING_DAYS || alerted.has(statementKey)) continue;

    const [installments] = await db
      .select({ cents: sql<number>`coalesce(sum(-${transactions.amountCents}), 0)::int` })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, card.accountId),
          eq(transactions.billMonth, openMonth),
          lt(transactions.amountCents, 0),
          sql`${transactions.installmentCount} > 1`,
        ),
      );
    result.push({
      userId,
      type: 'statement_closing',
      payload: {
        statementKey,
        accountId: card.accountId,
        bank: bankByAccount.get(card.accountId),
        closingDate: closingKey,
        daysLeft,
        totalCents: card.openBillCents,
        installmentsCents: installments?.cents ?? 0,
      },
    });
  }
  return result;
}

/** Cobrança duplicada de assinatura (§6.3, passo 5): olha as cobranças dos últimos 35 dias. */
async function detectDuplicateCharges(userId: string, now: Date) {
  const since = new Date(now.getTime() - 35 * DAY_MS);
  const [charges, alerted] = await Promise.all([
    db
      .select({
        id: transactions.id,
        recurrenceId: transactions.recurrenceId,
        amountCents: transactions.amountCents,
        postedAt: transactions.postedAt,
        merchantName: recurrences.merchantName,
      })
      .from(transactions)
      .innerJoin(recurrences, eq(recurrences.id, transactions.recurrenceId))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(recurrences.kind, 'subscription'),
          eq(transactions.isHidden, false),
          lt(transactions.amountCents, 0),
          gte(transactions.postedAt, since),
          lte(transactions.postedAt, now),
        ),
      ),
    existingKeys(userId, 'subscription_duplicate_charge', 'transactionId'),
  ]);
  const byId = new Map(charges.map((c) => [c.id, c]));
  return duplicateCharges(
    charges.map((c) => ({
      id: c.id,
      recurrenceId: c.recurrenceId!,
      amountCents: -c.amountCents,
      postedAt: c.postedAt,
    })),
  )
    .filter((d) => !alerted.has(d.id))
    .map((d) => ({
      userId,
      type: 'subscription_duplicate_charge',
      payload: {
        transactionId: d.id,
        firstTransactionId: d.firstId,
        recurrenceId: d.recurrenceId,
        merchantName: byId.get(d.id)?.merchantName ?? null,
        amountCents: -(byId.get(d.id)?.amountCents ?? 0),
      },
    }));
}

/** Limite de categoria (§6.5): aviso em 80% (se ligado) e estouro, uma vez por mês cada. */
async function detectCategoryLimits(userId: string, now: Date) {
  const month = todayKeySaoPaulo(now).slice(0, 7);
  const [limits, [summary], alerted80, alertedOver] = await Promise.all([
    db
      .select({
        id: goals.id,
        categoryId: goals.categoryId,
        targetCents: goals.targetCents,
        alertAtPct: goals.alertAtPct,
        startsMonth: goals.startsMonth,
        categoryName: categories.name,
      })
      .from(goals)
      .innerJoin(categories, eq(categories.id, goals.categoryId))
      .where(and(eq(goals.ownerId, userId), eq(goals.type, 'category_limit'))),
    db
      .select({ byCategory: monthlySummaries.byCategory })
      .from(monthlySummaries)
      .where(and(eq(monthlySummaries.userId, userId), eq(monthlySummaries.month, month))),
    existingKeys(userId, 'limit_80', 'limitKey'),
    existingKeys(userId, 'limit_exceeded', 'limitKey'),
  ]);
  const spent = (summary?.byCategory as Record<string, number> | undefined) ?? {};
  return limits.flatMap((limit) => {
    const spentCents = spent[limit.categoryId!] ?? 0;
    const status = categoryLimitStatus({
      spentCents,
      targetCents: limit.targetCents,
      alertAtPct: limit.alertAtPct,
      startsMonth: limit.startsMonth,
      monthKey: month,
    });
    const limitKey = `${limit.id}:${month}`;
    const payload = {
      limitKey,
      goalId: limit.id,
      categoryId: limit.categoryId,
      categoryName: limit.categoryName,
      spentCents,
      targetCents: limit.targetCents,
    };
    if (status === 'exceeded' && !alertedOver.has(limitKey))
      return [{ userId, type: 'limit_exceeded', payload }];
    if (status === 'warning' && !alerted80.has(limitKey))
      return [{ userId, type: 'limit_80', payload }];
    return [];
  });
}

export async function detectAlerts(
  userId: string,
  now = new Date(),
  options: { dryRun?: boolean } = {},
): Promise<{ created: number; found: { type: string; payload: Record<string, unknown> }[] }> {
  const found = (
    await Promise.all([
      detectUnusualPurchases(userId, now),
      detectCategoryPace(userId, now),
      detectPriceUps(userId, now),
      detectStatementClosing(userId, now),
      detectCategoryLimits(userId, now),
      detectDuplicateCharges(userId, now),
    ])
  ).flat();
  if (found.length > 0 && !options.dryRun) await db.insert(alerts).values(found);
  return { created: options.dryRun ? 0 : found.length, found };
}

/** Rodada diária (8h): todo mundo que tem transação. */
export async function detectAlertsForAllUsers(): Promise<{ users: number; created: number }> {
  const users = await db.selectDistinct({ id: transactions.userId }).from(transactions);
  let created = 0;
  for (const user of users) created += (await detectAlerts(user.id)).created;
  return { users: users.length, created };
}
