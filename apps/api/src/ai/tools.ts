// Ferramentas da Planor IA (CONTEXTO.md §6.7). A IA nunca faz conta (CLAUDE.md, princípio 2): cada
// ferramenta chama a MESMA rota da API que a tela usa (via `app.inject`, com o token de quem
// pergunta) e devolve números já prontos — valores formatados em reais, percentuais e totais
// calculados aqui. O modelo só escreve texto em cima disso.
//
// Privacidade (§6.7/§10): nome de transação passa por `transactionNameForAi` (sem números, e
// Pix/compra com pessoa vira rótulo genérico). Nada de conta, CPF ou id vai pro modelo.
import { formatCents, monthNamePtBR, transactionNameForAi } from '@planor/shared';
import { tool } from 'ai';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const money = (cents: number) => formatCents(cents).replace(/\u00a0/g, ' ');
const monthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .optional()
  .describe('Mês no formato YYYY-MM. Sem ele, o mês atual.');

/** Cartão de dados que acompanha a resposta (gráfico da categoria, Figma 33:674). Números da API. */
export type CategoryCard = {
  type: 'category';
  title: string;
  totalCents: number;
  pctVsAverage: number | null;
  months: { label: string; amountCents: number; active: boolean }[];
};

/** Proposta de limite (Figma 33:711): o valor sai do backend (80% da média), nunca do modelo. */
export type LimitProposalCard = {
  type: 'limit_proposal';
  categoryId: string;
  categoryName: string;
  targetCents: number;
  monthlyAverageCents: number | null;
  averageTicketCents: number | null;
};

/** Proposta de meta: nome, valor e prazo que o usuário disse — o app só cria se ele tocar. */
export type GoalProposalCard = {
  type: 'goal_proposal';
  name: string;
  targetCents: number;
  months: number | null;
};

export type ChatCard = CategoryCard | LimitProposalCard | GoalProposalCard;

/** Faixa do slider de limite (§6.5: R$ 100 a R$ 500) e o passo dele. */
const LIMIT_MIN_CENTS = 10_000;
const LIMIT_MAX_CENTS = 50_000;
const LIMIT_STEP_CENTS = 1_000;

type Fetcher = <T>(url: string) => Promise<T | null>;

export function makeFetcher(app: FastifyInstance, authorization: string): Fetcher {
  return async <T>(url: string) => {
    const response = await app.inject({ method: 'GET', url, headers: { authorization } });
    if (response.statusCode !== 200) return null;
    return response.json() as T;
  };
}

type SpendingSummary = {
  month: string;
  totalCents: number;
  trendVsLastMonthPct: number | null;
  fixedPct: number;
  variablePct: number;
  categories: { categoryId: string; name: string; amountCents: number; pctOfTotal: number }[];
};
type CategoryDetail = {
  category: { id: string; name: string };
  month: string;
  totalCents: number;
  transactionsCount: number;
  averageTicketCents: number;
  monthlyAverageCents: number | null;
  months: { month: string; label: string; amountCents: number }[];
  transactions: {
    postedAtDateKey: string;
    descriptionRaw: string;
    merchantName: string | null;
    amountCents: number;
  }[];
};
type TransactionRow = {
  postedAtDateKey: string;
  descriptionRaw: string;
  merchantName: string | null;
  amountCents: number;
  categoryName: string | null;
};

export function buildTools(fetch: Fetcher, onCard: (card: ChatCard) => void) {
  return {
    get_spending_by_category: tool({
      description:
        'Gasto do mês por categoria, com total, variação contra o mês anterior e fixo x variável.',
      inputSchema: z.object({ month: monthSchema }),
      execute: async ({ month }) => {
        const data = await fetch<SpendingSummary>(
          `/spending/summary${month ? `?month=${month}` : ''}`,
        );
        if (!data) return { error: 'Sem dados pra esse mês.' };
        return {
          mes: monthNamePtBR(data.month),
          total: money(data.totalCents),
          variacaoContraMesAnterior:
            data.trendVsLastMonthPct === null ? null : `${data.trendVsLastMonthPct}%`,
          fixoPct: `${data.fixedPct}%`,
          variavelPct: `${data.variablePct}%`,
          categorias: data.categories.map((c) => ({
            nome: c.name,
            valor: money(c.amountCents),
            doTotal: `${c.pctOfTotal}%`,
          })),
        };
      },
    }),

    get_category_detail: tool({
      description:
        'Detalhe de uma categoria num mês: total, quantas compras, ticket médio, média dos últimos meses e as maiores compras. Use também pra comparar com a média.',
      inputSchema: z.object({
        categoryName: z.string().describe('Nome da categoria, ex.: Delivery, Mercado.'),
        month: monthSchema,
      }),
      execute: async ({ categoryName, month }) => {
        const categories = await fetch<{ id: string; name: string }[]>('/categories');
        const normalize = (s: string) =>
          s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
        const category = categories?.find((c) => normalize(c.name) === normalize(categoryName));
        if (!category)
          return {
            error: `Não existe a categoria "${categoryName}".`,
            categoriasExistentes: categories?.map((c) => c.name) ?? [],
          };

        const data = await fetch<CategoryDetail>(
          `/spending/category/${category.id}${month ? `?month=${month}` : ''}`,
        );
        if (!data) return { error: 'Sem dados pra essa categoria.' };
        const pctVsAverage =
          data.monthlyAverageCents && data.monthlyAverageCents > 0
            ? Math.round(
                ((data.totalCents - data.monthlyAverageCents) / data.monthlyAverageCents) * 100,
              )
            : null;

        onCard({
          type: 'category',
          title: `${data.category.name} · ${monthNamePtBR(data.month)}`,
          totalCents: data.totalCents,
          pctVsAverage,
          months: data.months.map((m) => ({
            label: m.label,
            amountCents: m.amountCents,
            active: m.month === data.month,
          })),
        });

        return {
          categoria: data.category.name,
          mes: monthNamePtBR(data.month),
          total: money(data.totalCents),
          compras: data.transactionsCount,
          ticketMedio: money(data.averageTicketCents),
          mediaMensal: data.monthlyAverageCents === null ? null : money(data.monthlyAverageCents),
          variacaoContraMedia:
            pctVsAverage === null
              ? null
              : pctVsAverage === 0
                ? 'igual à média'
                : `${Math.abs(pctVsAverage)}% ${pctVsAverage > 0 ? 'acima' : 'abaixo'} da média`,
          ultimosMeses: data.months.map((m) => ({ mes: m.label, valor: money(m.amountCents) })),
          maioresCompras: [...data.transactions]
            .sort((a, b) => a.amountCents - b.amountCents)
            .slice(0, 5)
            .map((t) => ({
              dia: t.postedAtDateKey,
              nome: transactionNameForAi(t),
              valor: money(-t.amountCents),
            })),
        };
      },
    }),

    search_transactions: tool({
      description:
        'Busca transações por nome (ex.: "ifood", "uber") num mês, com o total gasto e recebido.',
      inputSchema: z.object({ query: z.string().min(2), month: monthSchema }),
      execute: async ({ query, month }) => {
        const params = new URLSearchParams({ q: query });
        if (month) params.set('month', month);
        const rows = (await fetch<TransactionRow[]>(`/transactions?${params}`)) ?? [];
        const spent = rows
          .filter((r) => r.amountCents < 0)
          .reduce((sum, r) => sum - r.amountCents, 0);
        const received = rows
          .filter((r) => r.amountCents > 0)
          .reduce((sum, r) => sum + r.amountCents, 0);
        return {
          encontradas: rows.length,
          totalGasto: money(spent),
          totalRecebido: money(received),
          transacoes: rows.slice(0, 15).map((r) => ({
            dia: r.postedAtDateKey,
            nome: transactionNameForAi(r),
            valor: money(Math.abs(r.amountCents)),
            tipo: r.amountCents < 0 ? 'saída' : 'entrada',
            categoria: r.categoryName ?? 'sem categoria',
          })),
        };
      },
    }),

    list_subscriptions: tool({
      description:
        'Assinaturas ativas: valor, uso marcado pelo usuário, reajuste, e o total por mês e por ano.',
      inputSchema: z.object({}),
      execute: async () => {
        const data = await fetch<{
          monthlyCents: number;
          yearlyCents: number;
          items: {
            merchantName: string;
            amountCents: number;
            usage: string;
            status: string;
            priceChange: { pct: number } | null;
          }[];
        }>('/future/subscriptions');
        if (!data) return { error: 'Sem dados de assinaturas.' };
        const usage: Record<string, string> = {
          high: 'usa com frequência',
          low: 'usa pouco',
          none: 'não usa',
          unknown: 'uso não marcado',
        };
        return {
          porMes: money(data.monthlyCents),
          porAno: money(data.yearlyCents),
          assinaturas: data.items
            .filter((i) => i.status === 'active')
            .map((i) => ({
              nome: i.merchantName,
              valor: money(i.amountCents),
              uso: usage[i.usage] ?? i.usage,
              reajuste: i.priceChange && i.priceChange.pct > 0 ? `+${i.priceChange.pct}%` : null,
            })),
        };
      },
    }),

    list_installments: tool({
      description:
        'Compras parceladas ativas: valor da parcela, quantas faltam, quanto falta pagar e quando termina.',
      inputSchema: z.object({}),
      execute: async () => {
        const data = await fetch<{
          monthlyCents: number;
          remainingCents: number;
          plans: {
            merchantName: string;
            installmentCents: number;
            current: number;
            count: number;
            remainingCents: number;
            lastMonth: string;
            settledEarly: boolean;
          }[];
        }>('/future/installments');
        if (!data) return { error: 'Sem dados de parcelas.' };
        return {
          porMes: money(data.monthlyCents),
          faltaPagar: money(data.remainingCents),
          parcelamentos: data.plans
            .filter((p) => !p.settledEarly)
            .map((p) => ({
              nome: p.merchantName,
              parcela: money(p.installmentCents),
              andamento: `${p.current} de ${p.count}`,
              faltaPagar: money(p.remainingCents),
              terminaEm: `${monthNamePtBR(p.lastMonth)} de ${p.lastMonth.slice(0, 4)}`,
            })),
        };
      },
    }),

    get_committed_by_month: tool({
      description:
        'Quanto já está comprometido nos próximos meses (parcelas, assinaturas e contas fixas) e as faturas a pagar.',
      inputSchema: z.object({}),
      execute: async () => {
        const data = await fetch<{
          committed: { totalCents: number; months: { label: string; amountCents: number }[] };
          statements: { bank: string; amountCents: number; dueDate: string }[];
        }>('/future/timeline');
        if (!data) return { error: 'Sem dados do futuro.' };
        return {
          totalComprometido: money(data.committed.totalCents),
          porMes: data.committed.months.map((m) => ({ mes: m.label, valor: money(m.amountCents) })),
          faturas: data.statements.map((s) => ({
            cartao: s.bank,
            valor: money(s.amountCents),
            vence: s.dueDate,
          })),
        };
      },
    }),

    get_projected_leftover: tool({
      description:
        'Sobra prevista até o fim do mês: renda, quanto já gastou, o que ainda vai cair e o resultado.',
      inputSchema: z.object({}),
      execute: async () => {
        const data = await fetch<{
          month: string;
          monthlyIncomeCents: number | null;
          spentThisMonthCents: number;
          due: { totalCents: number };
          projectedLeftoverCents: number | null;
        }>('/forecast/leftover');
        if (!data) return { error: 'Sem dados da sobra.' };
        if (data.monthlyIncomeCents === null)
          return {
            error:
              'O usuário ainda não informou a renda mensal; sem ela não dá pra prever a sobra.',
          };
        return {
          mes: monthNamePtBR(data.month),
          renda: money(data.monthlyIncomeCents),
          jaGasto: money(data.spentThisMonthCents),
          aindaVaiCair: money(data.due.totalCents),
          sobraPrevista:
            data.projectedLeftoverCents === null ? null : money(data.projectedLeftoverCents),
        };
      },
    }),

    get_goals: tool({
      description:
        'Metas do usuário (guardar dinheiro) e limites de categoria, com quanto já foi guardado ou gasto no mês.',
      inputSchema: z.object({}),
      execute: async () => {
        const data = await fetch<{
          items: {
            name: string;
            type: string;
            currentCents: number;
            targetCents: number;
            percent: number;
            caption: string;
          }[];
        }>('/goals');
        if (!data) return { error: 'Sem dados de metas.' };
        return {
          metas: data.items.map((g) => ({
            nome: g.name,
            tipo: g.type === 'category_limit' ? 'limite de categoria por mês' : 'guardar dinheiro',
            atual: money(g.currentCents),
            alvo: money(g.targetCents),
            percentual: `${g.percent}%`,
            situacao: g.caption.replace(/\u00a0/g, ' '),
          })),
        };
      },
    }),

    propose_category_limit: tool({
      description:
        'Propõe um limite mensal pra uma categoria (ex.: "me ajuda a gastar menos com delivery"). Mostra um cartão com "Criar limite" e "Ajustar valor"; NÃO cria nada — o usuário confirma no cartão. O valor é calculado aqui (80% da média mensal, entre R$ 100 e R$ 500).',
      inputSchema: z.object({ categoryName: z.string() }),
      execute: async ({ categoryName }) => {
        const categories = await fetch<{ id: string; name: string }[]>('/categories');
        const normalize = (s: string) =>
          s
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
        const category = categories?.find((c) => normalize(c.name) === normalize(categoryName));
        if (!category) return { error: `Não existe a categoria "${categoryName}".` };
        const data = await fetch<CategoryDetail>(`/spending/category/${category.id}`);
        const average = data?.monthlyAverageCents ?? null;
        const suggested = average
          ? Math.round((average * 0.8) / LIMIT_STEP_CENTS) * LIMIT_STEP_CENTS
          : 30_000;
        const targetCents = Math.min(LIMIT_MAX_CENTS, Math.max(LIMIT_MIN_CENTS, suggested));
        onCard({
          type: 'limit_proposal',
          categoryId: category.id,
          categoryName: category.name,
          targetCents,
          monthlyAverageCents: average,
          averageTicketCents: data?.averageTicketCents ?? null,
        });
        return {
          cartaoMostrado: true,
          categoria: category.name,
          limiteProposto: money(targetCents),
          mediaMensal: average === null ? null : money(average),
          observacao:
            'O cartão com "Criar limite" e "Ajustar valor" já aparece pra pessoa. Explique em uma frase, sem repetir botões.',
        };
      },
    }),

    propose_goal: tool({
      description:
        'Propõe uma meta de guardar dinheiro com o nome, o valor e o prazo que a PESSOA disse. Mostra um cartão com "Criar meta" e "Ajustar valor"; NÃO cria nada. Não invente valor nem prazo: se a pessoa não disse o valor, pergunte antes.',
      inputSchema: z.object({
        name: z.string().min(1).max(60),
        targetReais: z.number().positive().describe('Valor que a pessoa disse, em reais.'),
        months: z
          .number()
          .int()
          .positive()
          .max(120)
          .nullable()
          .describe('Prazo em meses que a pessoa disse, ou null.'),
      }),
      execute: async ({ name, targetReais, months }) => {
        const targetCents = Math.round(targetReais * 100);
        onCard({ type: 'goal_proposal', name, targetCents, months });
        return {
          cartaoMostrado: true,
          meta: name,
          valor: money(targetCents),
          prazo: months ? `${months} meses` : 'sem prazo',
          observacao:
            'O cartão já aparece pra pessoa, com o valor por mês calculado pelo app. Não calcule o valor por mês.',
        };
      },
    }),

    get_weekly_plan: tool({
      description: 'O plano da semana do usuário: as ações sugeridas e quais já foram feitas.',
      inputSchema: z.object({}),
      execute: async () => {
        const data = await fetch<{
          label: string;
          items: { title: string; description: string; completed: boolean }[];
        }>('/weekly-plan');
        if (!data) return { error: 'Sem plano da semana.' };
        return {
          semana: data.label,
          acoes: data.items.map((i) => ({
            titulo: i.title,
            detalhe: i.description.replace(/\u00a0/g, ' '),
            feita: i.completed,
          })),
        };
      },
    }),
  };
}
