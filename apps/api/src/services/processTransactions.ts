// Pipeline de dados (CONTEXTO.md §6.3) aplicado no banco — o que o job `process-transactions`
// (§9) roda depois de cada sincronização ou importação. Idempotente: rodar de novo sobre as
// mesmas transações não muda nada.
//
// Cobre: passo 1 (nome do estabelecimento + pagamento de fatura como transferência), passo 2
// (categorização por regras do usuário e globais), passo 4 (parcelas) e passo 9
// (`monthly_summaries` e `committed_by_month`). Ficam pra depois: recorrências (5), fora do padrão
// (7) e plano da semana (9) — ver PROGRESSO.md.
import { and, eq, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import { accounts, categories, categoryRules, committedByMonth, installmentPlans, monthlySummaries, recurrences, transactions } from '@planor/db';
import {
  buildMonthlySummaries,
  categorizeTransaction,
  detectInstallmentPlans,
  isCardBillPayment,
  monthKeySaoPaulo,
  normalizeForMatch,
  normalizeMerchantName,
  projectCommittedByMonth,
  type DetectedInstallmentPlan,
  type ExpenseKind,
} from '@planor/shared';
import { db } from '../lib/db';

type TransactionPatch = {
  id: string;
  merchantName: string;
  categoryId: string | null;
  categorySource: 'user_rule' | 'global_rule' | null;
  expenseKind: ExpenseKind | null;
  isTransfer: boolean;
};

const UPDATE_CHUNK = 200;

/** Um UPDATE ... FROM (VALUES ...) por lote, em vez de uma query por transação — a primeira
 * passada sobre um banco recém-conectado tem centenas/milhares de linhas. */
async function applyPatches(patches: TransactionPatch[]) {
  for (let i = 0; i < patches.length; i += UPDATE_CHUNK) {
    const chunk = patches.slice(i, i + UPDATE_CHUNK);
    const values = sql.join(
      chunk.map(
        (p) =>
          sql`(${p.id}::uuid, ${p.merchantName}, ${p.categoryId}::uuid, ${p.categorySource}::category_source, ${p.expenseKind}::expense_kind, ${p.isTransfer}::boolean)`,
      ),
      sql`, `,
    );
    await db.execute(sql`
      update transactions as t set
        merchant_name = v.merchant_name,
        category_id = v.category_id,
        category_source = v.category_source,
        expense_kind = v.expense_kind,
        is_transfer = v.is_transfer
      from (values ${values}) as v(id, merchant_name, category_id, category_source, expense_kind, is_transfer)
      where t.id = v.id
    `);
  }
}

/** Passos 1 e 2 sobre todas as transações do usuário. Nunca sobrescreve escolha do usuário:
 * categoria `manual` (ou `ai`, quando existir) fica como está, `expenseKind` já preenchido
 * também, e `isTransfer` só é ligado, nunca desligado. */
async function normalizeAndCategorize(userId: string): Promise<{ updated: number }> {
  const [rules, categoryRows, rows] = await Promise.all([
    db.select().from(categoryRules).where(eq(categoryRules.userId, userId)),
    db
      .select()
      .from(categories)
      .where(or(isNull(categories.userId), eq(categories.userId, userId))),
    db
      .select({
        id: transactions.id,
        descriptionRaw: transactions.descriptionRaw,
        merchantName: transactions.merchantName,
        amountCents: transactions.amountCents,
        categoryId: transactions.categoryId,
        categorySource: transactions.categorySource,
        expenseKind: transactions.expenseKind,
        isTransfer: transactions.isTransfer,
        accountType: accounts.type,
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(eq(transactions.userId, userId)),
  ]);

  // Categoria global do dicionário → id. Se o usuário tiver uma com o mesmo nome, a global vence
  // (o dicionário fala das categorias padrão do §6.3, passo 3).
  const globalIdByName = new Map(categoryRows.filter((c) => c.userId === null).map((c) => [c.name, c.id]));
  const kindById = new Map(categoryRows.map((c) => [c.id, c.defaultKind]));
  const ruleInputs = rules.map((r) => ({ matchType: r.matchType, pattern: r.pattern, categoryId: r.categoryId, expenseKind: r.expenseKind }));

  const patches: TransactionPatch[] = [];
  for (const row of rows) {
    // Seed e importações antigas já trazem um nome "bonito" escolhido à mão (ex.: "Pizzaria
    // Bella Massa") — só recalcula quando o nome atual ainda é a própria descrição crua.
    const merchantName =
      !row.merchantName || row.merchantName === row.descriptionRaw ? normalizeMerchantName(row.descriptionRaw) : row.merchantName;
    const isTransfer = row.isTransfer || isCardBillPayment({ descriptionRaw: row.descriptionRaw, accountType: row.accountType });

    let categoryId = row.categoryId;
    let categorySource = row.categorySource;
    let expenseKind = row.expenseKind;

    const userOwnsCategory = categorySource === 'manual' || categorySource === 'ai';
    if (!userOwnsCategory && !isTransfer) {
      const result = categorizeTransaction({ descriptionRaw: row.descriptionRaw, merchantName, amountCents: row.amountCents }, ruleInputs);
      const resolvedId = result?.categoryId ?? (result?.categoryName ? globalIdByName.get(result.categoryName) : undefined);
      if (result && resolvedId) {
        categoryId = resolvedId;
        categorySource = result.source;
        expenseKind ??= result.expenseKind ?? (row.amountCents < 0 ? (kindById.get(resolvedId) ?? null) : null);
      } else if (categorySource === 'user_rule' || categorySource === 'global_rule') {
        // A regra que tinha categorizado não existe mais (ex.: usuário apagou) — volta pra sem categoria.
        categoryId = null;
        categorySource = null;
      }
    }

    const changed =
      merchantName !== row.merchantName ||
      categoryId !== row.categoryId ||
      categorySource !== row.categorySource ||
      expenseKind !== row.expenseKind ||
      isTransfer !== row.isTransfer;
    if (changed) {
      patches.push({
        id: row.id,
        merchantName,
        categoryId,
        categorySource: categorySource as TransactionPatch['categorySource'],
        expenseKind,
        isTransfer,
      });
    }
  }

  await applyPatches(patches);
  return { updated: patches.length };
}

/** Passo 9 — recalcula `monthly_summaries` de todos os meses do usuário até hoje. Transação com
 * data futura (o Pluggy já devolve as próximas parcelas do cartão) não é gasto ainda — é
 * "comprometido", que é outro agregado (Fase 3). */
async function recomputeMonthlySummaries(userId: string): Promise<{ months: number }> {
  const now = new Date();
  const [rows, categoryRows] = await Promise.all([
    db
      .select({
        postedAt: transactions.postedAt,
        amountCents: transactions.amountCents,
        categoryId: transactions.categoryId,
        expenseKind: transactions.expenseKind,
        isHidden: transactions.isHidden,
        isTransfer: transactions.isTransfer,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), lte(transactions.postedAt, now))),
    db
      .select()
      .from(categories)
      .where(or(isNull(categories.userId), eq(categories.userId, userId))),
  ]);

  const outros = categoryRows.find((c) => c.userId === null && c.name === 'Outros');
  if (!outros) throw new Error('Categoria global "Outros" não existe — rode o seed (packages/db).');

  const summaries = buildMonthlySummaries(rows, categoryRows, outros.id);

  // Apaga e regrava dentro de uma transação: um mês que deixou de ter gasto (ex.: tudo ocultado)
  // não pode ficar com o número velho.
  await db.transaction(async (tx) => {
    await tx.delete(monthlySummaries).where(eq(monthlySummaries.userId, userId));
    if (summaries.length > 0) {
      await tx.insert(monthlySummaries).values(summaries.map((s) => ({ userId, ...s })));
    }
  });

  return { months: summaries.length };
}

const COMMITTED_HORIZON_MONTHS = 6; // o Futuro mostra os próximos 6 meses (§6.6)

/** Mesma identidade que o passo 4 usa pra agrupar parcelas (sem o valor, que varia 1 centavo). */
function planKey(plan: { accountId: string; merchantName: string; count: number; firstMonth: string }) {
  return [plan.accountId, normalizeForMatch(plan.merchantName), plan.count, plan.firstMonth].join('|');
}

/** Passo 4 — parcelamentos ativos. Atualiza no lugar os que já existiam (mantém o id e o que o
 * usuário marcou, como "já quitei antecipado"), cria os novos, apaga os que terminaram ou não
 * aparecem mais, e liga cada parcela (transação) ao seu parcelamento. */
async function syncInstallmentPlans(userId: string, referenceMonth: string): Promise<DetectedInstallmentPlan[]> {
  const rows = await db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      descriptionRaw: transactions.descriptionRaw,
      merchantName: transactions.merchantName,
      postedAt: transactions.postedAt,
      amountCents: transactions.amountCents,
      installmentNumber: transactions.installmentNumber,
      installmentCount: transactions.installmentCount,
      billMonth: transactions.billMonth,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.isHidden, false), eq(transactions.isTransfer, false)));

  const detected = detectInstallmentPlans(rows, referenceMonth);

  await db.transaction(async (tx) => {
    const existing = await tx.select().from(installmentPlans).where(eq(installmentPlans.userId, userId));
    const existingByKey = new Map(
      existing.map((p) => [
        planKey({ accountId: p.accountId, merchantName: p.merchantName, count: p.count, firstMonth: p.firstDate.slice(0, 7) }),
        p,
      ]),
    );

    const keptIds = new Set<string>();
    const links: { transactionId: string; planId: string }[] = [];
    for (const plan of detected) {
      const values = {
        userId,
        accountId: plan.accountId,
        merchantName: plan.merchantName,
        totalCents: plan.totalCents,
        installmentCents: plan.installmentCents,
        count: plan.count,
        current: plan.current,
        firstDate: `${plan.firstMonth}-01`,
        lastDate: `${plan.lastMonth}-01`,
      };
      const match = existingByKey.get(planKey(plan));
      const planId = match
        ? (
            await tx
              .update(installmentPlans)
              .set({ current: values.current, installmentCents: values.installmentCents, totalCents: values.totalCents, lastDate: values.lastDate })
              .where(eq(installmentPlans.id, match.id))
              .returning()
          )[0]!.id
        : (await tx.insert(installmentPlans).values(values).returning())[0]!.id;
      keptIds.add(planId);
      for (const transactionId of plan.transactionIds) links.push({ transactionId, planId });
    }

    // Desliga tudo e religa o que vale agora — mais simples que comparar vínculo a vínculo.
    await tx
      .update(transactions)
      .set({ installmentPlanId: null })
      .where(and(eq(transactions.userId, userId), isNotNull(transactions.installmentPlanId)));
    for (let i = 0; i < links.length; i += UPDATE_CHUNK) {
      const values = sql.join(
        links.slice(i, i + UPDATE_CHUNK).map((l) => sql`(${l.transactionId}::uuid, ${l.planId}::uuid)`),
        sql`, `,
      );
      await tx.execute(sql`
        update transactions as t set installment_plan_id = v.plan_id
        from (values ${values}) as v(id, plan_id)
        where t.id = v.id
      `);
    }

    const staleIds = existing.filter((p) => !keptIds.has(p.id)).map((p) => p.id);
    if (staleIds.length > 0) await tx.delete(installmentPlans).where(inArray(installmentPlans.id, staleIds));
  });

  return detected;
}

/** Passo 9 — `committed_by_month` dos próximos meses: parcelas detectadas + recorrências ativas. */
async function recomputeCommittedByMonth(userId: string, referenceMonth: string, plans: DetectedInstallmentPlan[]): Promise<{ months: number }> {
  const activeRecurrences = await db
    .select({ kind: recurrences.kind, amountCents: recurrences.amountCents, cadenceDays: recurrences.cadenceDays, nextChargeAt: recurrences.nextChargeAt })
    .from(recurrences)
    .where(and(eq(recurrences.userId, userId), eq(recurrences.status, 'active')));

  const months = projectCommittedByMonth({
    referenceMonth,
    horizon: COMMITTED_HORIZON_MONTHS,
    installments: plans,
    recurrences: activeRecurrences,
  });

  await db.transaction(async (tx) => {
    await tx.delete(committedByMonth).where(eq(committedByMonth.userId, userId));
    if (months.length > 0) await tx.insert(committedByMonth).values(months.map((m) => ({ userId, ...m })));
  });

  return { months: months.length };
}

export async function processUserTransactions(userId: string) {
  const referenceMonth = monthKeySaoPaulo(new Date());
  const { updated } = await normalizeAndCategorize(userId);
  const { months } = await recomputeMonthlySummaries(userId);
  const plans = await syncInstallmentPlans(userId, referenceMonth);
  const committed = await recomputeCommittedByMonth(userId, referenceMonth, plans);
  return { updated, months, installmentPlans: plans.length, committedMonths: committed.months };
}
