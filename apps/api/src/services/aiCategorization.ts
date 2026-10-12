// Passo 2.3 do pipeline (CONTEXTO.md §6.3): categorização por IA, só pro que sobrou sem
// categoria depois das regras do usuário e do dicionário global. Haiku, saída em JSON, categoria
// dentro da lista fechada das categorias do usuário; `category_source = 'ai'` e o grau de
// confiança ficam na transação.
//
// - Pergunta por estabelecimento, não por transação, e guarda a resposta em
//   `ai_merchant_categories` — o mesmo estabelecimento nunca é perguntado duas vezes.
// - Só vai o que pode ir (§10): nome do estabelecimento sem números, valor típico e se foi no
//   cartão, no débito ou Pix pra empresa. Nada de nome do usuário, conta, CPF ou Pix pra pessoa
//   (`isAiEligible`/`merchantNameForAi` em packages/shared).
// - Sem chave ou com erro do provedor: não faz nada e tenta de novo na próxima sincronização. O
//   pipeline nunca falha por causa da IA.
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, Output } from 'ai';
import { and, eq, inArray, isNull, lt, or } from 'drizzle-orm';
import { accounts, aiMerchantCategories, categories, transactions } from '@planor/db';
import { AI_MIN_CONFIDENCE, aiMerchantKey, isAiEligible, merchantNameForAi } from '@planor/shared';
import { z } from 'zod';
import { env } from '../env';
import { db } from '../lib/db';

export const AI_CATEGORIZE_MODEL = 'claude-haiku-5-5';
/** Estabelecimentos por chamada e por rodada — limita o custo de uma conta recém-conectada. */
const BATCH_SIZE = 60;
const MAX_MERCHANTS_PER_RUN = 300;
const UNKNOWN = 'Não sei';

/** Ajuda o modelo a separar categorias parecidas. Categoria criada pelo usuário vai só com o nome. */
const CATEGORY_HINTS: Record<string, string> = {
  Moradia: 'aluguel, condomínio, IPTU, reforma, móveis',
  Mercado: 'supermercado, atacado, hortifrúti, padaria, açougue',
  Delivery: 'pedidos por aplicativo de entrega (iFood, Rappi), restaurante, lanchonete, bar, café',
  Transporte:
    'combustível, aplicativo de corrida, estacionamento, pedágio, ônibus, manutenção do carro',
  Saúde: 'farmácia, consulta, exame, plano de saúde, academia, fisioterapia',
  Assinaturas: 'serviço digital cobrado todo mês (streaming, música, software, nuvem, IA)',
  'Contas da casa': 'energia, água, gás, internet, telefone, celular',
  Lazer: 'cinema, show, viagem, hotel, jogos, compras em apps de vídeo e redes sociais',
  Educação: 'curso, escola, faculdade, livro, plataforma de ensino',
  Compras: 'loja, roupa, eletrônico, marketplace, cosmético, presente',
  Outros: 'tarifa, imposto, IOF, serviço que não cabe em nenhuma outra',
};

type Pending = { key: string; name: string; channel: string; typicalCents: number; count: number };

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function channelOf(accountType: string, descriptionRaw: string): string {
  if (accountType === 'credit_card') return 'cartão de crédito';
  if (/^compra no d[eé]bito/i.test(descriptionRaw)) return 'cartão de débito';
  return 'Pix/transferência para empresa';
}

async function askModel(apiKey: string, categoryNames: string[], items: Pending[]) {
  const anthropic = createAnthropic({ apiKey });
  const schema = z.object({
    items: z.array(
      z.object({
        index: z.number().int(),
        category: z.enum([UNKNOWN, ...categoryNames] as [string, ...string[]]),
        confidence: z.number().min(0).max(1),
      }),
    ),
  });
  const categoryList = categoryNames
    .map((name) => (CATEGORY_HINTS[name] ? `- ${name}: ${CATEGORY_HINTS[name]}` : `- ${name}`))
    .join('\n');
  const merchantList = items
    .map(
      (item, index) =>
        `${index}. ${item.name} — ${item.channel}, ${item.count}x, valor típico R$ ${(item.typicalCents / 100).toFixed(2).replace('.', ',')}`,
    )
    .join('\n');

  const { output, usage } = await generateText({
    model: anthropic(AI_CATEGORIZE_MODEL),
    output: Output.object({ schema }),
    system:
      'Você classifica gastos de um app brasileiro de finanças pessoais. Para cada estabelecimento, escolha UMA categoria da lista. ' +
      `Se não der pra saber com segurança o que é o estabelecimento, responda "${UNKNOWN}" — é melhor não categorizar do que errar. ` +
      'A confiança vai de 0 a 1: use acima de 0,8 só quando o nome deixa claro o tipo de negócio.\n\nCategorias:\n' +
      categoryList,
    prompt: `Estabelecimentos:\n${merchantList}\n\nResponda um item por estabelecimento, com o mesmo índice.`,
  });
  return { answers: output.items, usage };
}

export type AiCategorizationResult = {
  asked: number;
  applied: number;
  inputTokens: number;
  outputTokens: number;
  skipped?: string;
};

/** `apply: false` só pergunta e guarda as respostas (pra conferir antes de mexer nas transações). */
export async function categorizeWithAi(
  userId: string,
  options: { apply?: boolean } = {},
): Promise<AiCategorizationResult> {
  const result: AiCategorizationResult = { asked: 0, applied: 0, inputTokens: 0, outputTokens: 0 };

  const [categoryRows, rows, cached] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        defaultKind: categories.defaultKind,
        userId: categories.userId,
      })
      .from(categories)
      .where(or(isNull(categories.userId), eq(categories.userId, userId))),
    db
      .select({
        id: transactions.id,
        descriptionRaw: transactions.descriptionRaw,
        merchantName: transactions.merchantName,
        amountCents: transactions.amountCents,
        expenseKind: transactions.expenseKind,
        accountType: accounts.type,
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(
        and(
          eq(transactions.userId, userId),
          isNull(transactions.categoryId),
          eq(transactions.isTransfer, false),
          eq(transactions.isHidden, false),
          lt(transactions.amountCents, 0),
        ),
      ),
    db.select().from(aiMerchantCategories).where(eq(aiMerchantCategories.userId, userId)),
  ]);

  // Nome de categoria → id. Se o usuário tiver uma com o mesmo nome de uma padrão, vale a dele.
  const idByName = new Map<string, string>();
  for (const c of [...categoryRows].sort(
    (a, b) => Number(a.userId !== null) - Number(b.userId !== null),
  ))
    idByName.set(c.name, c.id);
  const kindById = new Map(categoryRows.map((c) => [c.id, c.defaultKind]));
  const cache = new Map(cached.map((c) => [c.merchantKey, c]));

  // Agrupa por estabelecimento o que pode ir pra IA e ainda não foi perguntado.
  const groups = new Map<
    string,
    { name: string; channel: string; amounts: number[]; ids: string[] }
  >();
  for (const row of rows) {
    const merchantName = row.merchantName ?? row.descriptionRaw;
    if (
      !isAiEligible({
        descriptionRaw: row.descriptionRaw,
        merchantName,
        accountType: row.accountType,
      })
    )
      continue;
    const name = merchantNameForAi(merchantName);
    if (!name) continue;
    const key = aiMerchantKey(merchantName);
    const group = groups.get(key) ?? {
      name,
      channel: channelOf(row.accountType, row.descriptionRaw),
      amounts: [],
      ids: [],
    };
    group.amounts.push(-row.amountCents);
    group.ids.push(row.id);
    groups.set(key, group);
  }

  const pending: Pending[] = [...groups.entries()]
    .filter(([key]) => !cache.has(key))
    .map(([key, g]) => ({
      key,
      name: g.name,
      channel: g.channel,
      typicalCents: median(g.amounts),
      count: g.amounts.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_MERCHANTS_PER_RUN);

  if (pending.length > 0) {
    if (!env.ANTHROPIC_API_KEY) {
      result.skipped = 'sem ANTHROPIC_API_KEY';
    } else {
      const categoryNames = [...idByName.keys()];
      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const batch = pending.slice(i, i + BATCH_SIZE);
        try {
          const { answers, usage } = await askModel(env.ANTHROPIC_API_KEY, categoryNames, batch);
          result.inputTokens += usage.inputTokens ?? 0;
          result.outputTokens += usage.outputTokens ?? 0;
          const values = answers
            .filter((a) => batch[a.index])
            .map((a) => ({
              userId,
              merchantKey: batch[a.index]!.key,
              categoryId: a.category === UNKNOWN ? null : (idByName.get(a.category) ?? null),
              confidence: a.confidence,
              model: AI_CATEGORIZE_MODEL,
            }));
          if (values.length > 0)
            await db.insert(aiMerchantCategories).values(values).onConflictDoNothing();
          for (const v of values) cache.set(v.merchantKey, { ...v, createdAt: new Date() });
          result.asked += batch.length;
        } catch (err) {
          // Chave vencida, sem crédito, fora do ar: tenta de novo na próxima sincronização.
          result.skipped = err instanceof Error ? err.message.slice(0, 200) : 'erro desconhecido';
          break;
        }
      }
    }
  }

  if (options.apply === false) return result;

  // Aplica o que está no cache (inclusive respostas de rodadas anteriores pra compras novas). Um
  // UPDATE por estabelecimento e tipo de gasto, não por transação.
  const expenseKindById = new Map(rows.map((r) => [r.id, r.expenseKind]));
  let applied = 0;
  for (const [key, group] of groups) {
    const answer = cache.get(key);
    if (!answer?.categoryId || answer.confidence < AI_MIN_CONFIDENCE) continue;
    const fallbackKind = kindById.get(answer.categoryId) ?? null;
    const byKind = new Map<string | null, string[]>();
    for (const id of group.ids) {
      const kind = expenseKindById.get(id) ?? fallbackKind;
      byKind.set(kind, [...(byKind.get(kind) ?? []), id]);
    }
    for (const [kind, ids] of byKind) {
      await db
        .update(transactions)
        .set({
          categoryId: answer.categoryId,
          categorySource: 'ai',
          confidence: answer.confidence,
          expenseKind: kind as 'fixed' | 'variable' | null,
        })
        .where(and(inArray(transactions.id, ids), isNull(transactions.categoryId)));
    }
    applied += group.ids.length;
  }
  result.applied = applied;
  return result;
}
