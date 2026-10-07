// Seed com os dados fictícios do CONTEXTO.md §12 (Bruno, outubro/2026) — os mesmos números
// usados nas telas do Figma. Os totais batem entre si; usar como base pros mocks e pro
// desenvolvimento da Fase 1.
//
// Não é exaustivo: por exemplo, as transações de Delivery aqui são uma amostra representativa,
// não os 14 pedidos citados no §12 — o objetivo é exercitar cada tabela do schema, não
// reproduzir cada linha do texto. O feed (posts/reações/comentários) fica vazio: o §12 não dá
// conteúdo fictício específico pra isso.

import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { eq, sql } from 'drizzle-orm';
import { createDb } from './client';
import * as s from './schema';

// packages/db/src/seed.ts → raiz do monorepo é 3 níveis acima (src → db → packages → raiz).
config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL não definida — copie .env.example para .env na raiz do repo.');
}

const db = createDb(connectionString);

// E-mails fictícios do §12 (Ana, Rafa, Júlia, Pedro, Marina) sempre ganham um UUID fixo — eles
// não são pessoas de verdade logando no app. O Bruno é diferente: se SUPABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY estiverem configuradas, buscamos o id real dele no Supabase Auth
// (pelo e-mail de quem está rodando o seed) e usamos ESSE id — assim, assim que você logar de
// verdade no app, os dados fictícios do Bruno já aparecem na sua conta. Sem Supabase configurado
// ainda, cai num UUID fixo (dá pra rodar o seed antes mesmo de ter Auth funcionando).
const FIXED_IDS = {
  bruno: '00000000-0000-4000-8000-000000000001',
  ana: '00000000-0000-4000-8000-000000000002',
  rafa: '00000000-0000-4000-8000-000000000003',
  julia: '00000000-0000-4000-8000-000000000004',
  pedro: '00000000-0000-4000-8000-000000000005',
  marina: '00000000-0000-4000-8000-000000000006',
} as const;

async function resolveBrunoIdentity(realEmail: string): Promise<{ id: string; email: string }> {
  const fallback = { id: FIXED_IDS.bruno, email: 'bruno@email.com' }; // e-mail fictício do §12

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('Supabase não configurado ainda — Bruno fica com um id fixo, não o seu id real.');
    return fallback;
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.log(`Não consegui listar usuários do Supabase Auth (${error.message}) — Bruno fica com um id fixo.`);
    return fallback;
  }

  const match = data.users.find((u) => u.email?.toLowerCase() === realEmail.toLowerCase());
  if (match?.email) {
    console.log(`Achei ${realEmail} no Supabase Auth — os dados fictícios do Bruno vão ficar na sua conta real.`);
    return { id: match.id, email: match.email };
  }

  console.log(`${realEmail} ainda não criou conta no app — Bruno fica com um id fixo por enquanto.`);
  return fallback;
}

async function seed() {
  console.log('Limpando dados existentes...');
  // Ordem inversa de dependência. TRUNCATE ... CASCADE cobre o resto.
  await db.execute(sql`
    truncate table
      ai_usage, ai_messages, ai_conversations,
      referral_events, referrals, subscriptions, monthly_recaps,
      split_expenses, challenge_members, challenges, post_comments, post_reactions, posts, friendships,
      invites, settlements, household_expenses, household_categories, household_members, households,
      alerts, weekly_plans, goal_contributions, goal_participants, goals,
      committed_by_month, monthly_summaries,
      transactions, manual_recurring_bills, recurrences, installment_plans,
      category_rules, categories,
      card_statements, credit_cards, accounts, connections, institutions,
      notification_prefs, settings, devices, users
    restart identity cascade
  `);

  // ---------- Categorias globais (§6.3, passo 3) ----------
  console.log('Categorias...');
  const categoryNames = [
    'Moradia',
    'Mercado',
    'Delivery',
    'Transporte',
    'Saúde',
    'Assinaturas',
    'Contas da casa',
    'Lazer',
    'Educação',
    'Compras',
    'Outros',
  ] as const;
  const FIXED_CATEGORY_NAMES = new Set(['Moradia', 'Saúde', 'Assinaturas', 'Contas da casa']);
  const insertedCategories = await db
    .insert(s.categories)
    .values(
      categoryNames.map((name) => ({
        name,
        defaultKind: FIXED_CATEGORY_NAMES.has(name) ? ('fixed' as const) : ('variable' as const),
      })),
    )
    .returning();
  const categoryByName = Object.fromEntries(insertedCategories.map((c) => [c.name, c]));
  const cat = (name: (typeof categoryNames)[number]) => categoryByName[name]!;

  // ---------- Usuários (§12) ----------
  console.log('Usuários...');
  const brunoIdentity = await resolveBrunoIdentity('brunohenriquepho2@gmail.com');
  const [bruno, ana, rafa, julia, pedro, marina] = await db
    .insert(s.users)
    .values([
      {
        id: brunoIdentity.id,
        email: brunoIdentity.email,
        name: 'Bruno',
        monthlyIncomeCents: 650_000,
        payday: 5,
        feelingScore: 3,
        onboardingGoals: ['installments', 'subscriptions', 'leftover'],
        plan: 'pro_family',
      },
      { id: FIXED_IDS.ana, email: 'ana@email.com', name: 'Ana', plan: 'free' },
      { id: FIXED_IDS.rafa, email: 'rafa@email.com', name: 'Rafa', plan: 'free' },
      { id: FIXED_IDS.julia, email: 'julia@email.com', name: 'Júlia', plan: 'free' },
      { id: FIXED_IDS.pedro, email: 'pedro@email.com', name: 'Pedro', plan: 'free' },
      { id: FIXED_IDS.marina, email: 'marina@email.com', name: 'Marina', plan: 'free' },
    ])
    .returning();
  if (!bruno || !ana || !rafa || !julia || !pedro || !marina) throw new Error('Falha ao criar usuários');

  await db.insert(s.settings).values({ userId: bruno.id });

  // ---------- Bancos (§12) ----------
  console.log('Bancos e conexões...');
  const [nubank, itau, inter] = await db
    .insert(s.institutions)
    .values([
      { name: 'Nubank', aggregatorId: 'sandbox-nubank' },
      { name: 'Itaú', aggregatorId: 'sandbox-itau' },
      { name: 'Banco Inter', aggregatorId: 'sandbox-inter' },
    ])
    .returning();
  if (!nubank || !itau || !inter) throw new Error('Falha ao criar instituições');

  const [connNubank, connItau, connInter] = await db
    .insert(s.connections)
    .values([
      {
        userId: bruno.id,
        institutionId: nubank.id,
        aggregatorItemId: 'item-nubank-1',
        status: 'connected',
        consentExpiresAt: new Date('2027-07-01'),
        lastSyncAt: new Date(),
      },
      {
        userId: bruno.id,
        institutionId: itau.id,
        aggregatorItemId: 'item-itau-1',
        status: 'connected',
        consentExpiresAt: new Date('2026-10-12'), // vence em 12/10/2026 — gatilho de consent_expiring
        lastSyncAt: new Date(),
      },
      {
        userId: bruno.id,
        institutionId: inter.id,
        aggregatorItemId: 'item-inter-1',
        status: 'consent_expired',
        consentExpiresAt: new Date('2026-08-01'),
        lastSyncAt: new Date('2026-08-01'),
      },
    ])
    .returning();
  if (!connNubank || !connItau || !connInter) throw new Error('Falha ao criar conexões');

  const [nubankChecking, nubankCard, itauChecking, itauCard] = await db
    .insert(s.accounts)
    .values([
      { connectionId: connNubank.id, userId: bruno.id, type: 'checking', name: 'Nubank', balanceCents: 214_035 },
      { connectionId: connNubank.id, userId: bruno.id, type: 'credit_card', name: 'Nubank Cartão', balanceCents: 0 },
      { connectionId: connItau.id, userId: bruno.id, type: 'checking', name: 'Itaú', balanceCents: 438_090 },
      { connectionId: connItau.id, userId: bruno.id, type: 'credit_card', name: 'Itaú Cartão', balanceCents: 0 },
    ])
    .returning();
  if (!nubankChecking || !nubankCard || !itauChecking || !itauCard) throw new Error('Falha ao criar contas');

  await db.insert(s.creditCards).values([
    { accountId: nubankCard.id, closingDay: 3, dueDay: 10 },
    { accountId: itauCard.id, closingDay: 8, dueDay: 15 },
  ]);

  await db.insert(s.cardStatements).values([
    {
      accountId: nubankCard.id,
      period: '2026-11',
      closingDate: new Date('2026-11-03'),
      dueDate: new Date('2026-11-10'),
      totalCents: 148_260,
      status: 'open',
    },
    {
      accountId: itauCard.id,
      period: '2026-11',
      closingDate: new Date('2026-11-08'),
      dueDate: new Date('2026-11-15'),
      totalCents: 85_755,
      status: 'open',
    },
  ]);

  // ---------- Parcelas (§12) ----------
  console.log('Parcelas...');
  await db.insert(s.installmentPlans).values([
    {
      userId: bruno.id,
      accountId: nubankCard.id,
      merchantName: 'Celular',
      totalCents: 240_000,
      installmentCents: 24_000,
      count: 10,
      current: 3,
      firstDate: '2026-08-01',
      lastDate: '2027-07-01',
    },
    {
      userId: bruno.id,
      accountId: itauCard.id,
      merchantName: 'Notebook',
      totalCents: 456_000,
      installmentCents: 38_000,
      count: 12,
      current: 7,
      firstDate: '2026-04-01',
      lastDate: '2027-03-01',
    },
    {
      userId: bruno.id,
      accountId: nubankCard.id,
      merchantName: 'Curso online',
      totalCents: 96_000,
      installmentCents: 16_000,
      count: 6,
      current: 2,
      firstDate: '2026-09-01',
      lastDate: '2027-02-01',
    },
    {
      userId: bruno.id,
      accountId: nubankCard.id,
      merchantName: 'Tênis',
      totalCents: 39_000,
      installmentCents: 13_000,
      count: 3,
      current: 1,
      firstDate: '2026-10-01',
      lastDate: '2026-12-01',
    },
    {
      userId: bruno.id,
      accountId: itauCard.id,
      merchantName: 'Geladeira',
      totalCents: 126_000,
      installmentCents: 21_000,
      count: 6,
      current: 5,
      firstDate: '2026-07-01',
      lastDate: '2026-11-01',
    },
  ]);

  // ---------- Assinaturas e fixos recorrentes (§12) ----------
  console.log('Assinaturas e fixos...');
  await db.insert(s.recurrences).values([
    { userId: bruno.id, kind: 'subscription', merchantName: 'Academia', amountCents: 5_990, cadenceDays: 30, usage: 'high', priceHistory: [] },
    {
      userId: bruno.id,
      kind: 'subscription',
      merchantName: 'Streaming de vídeo',
      amountCents: 3_990,
      cadenceDays: 30,
      usage: 'none',
      priceHistory: [
        { amountCents: 3_490, at: '2026-06-12' },
        { amountCents: 3_990, at: '2026-10-12' },
      ],
      nextChargeAt: new Date('2026-11-12'),
    },
    { userId: bruno.id, kind: 'subscription', merchantName: 'App de idiomas', amountCents: 2_790, cadenceDays: 30, usage: 'none', priceHistory: [] },
    {
      userId: bruno.id,
      kind: 'subscription',
      merchantName: 'Música',
      amountCents: 2_190,
      cadenceDays: 30,
      usage: 'high',
      priceHistory: [
        { amountCents: 1_990, at: '2026-07-01' },
        { amountCents: 2_190, at: '2026-10-01' },
      ],
    },
    { userId: bruno.id, kind: 'subscription', merchantName: 'Jogos', amountCents: 1_000, cadenceDays: 30, usage: 'low', priceHistory: [] },
    { userId: bruno.id, kind: 'subscription', merchantName: 'Notícias', amountCents: 1_000, cadenceDays: 30, usage: 'low', priceHistory: [] },
    { userId: bruno.id, kind: 'subscription', merchantName: 'Nuvem', amountCents: 990, cadenceDays: 30, usage: 'high', priceHistory: [] },
    { userId: bruno.id, kind: 'subscription', merchantName: 'Revista', amountCents: 790, cadenceDays: 30, usage: 'low', priceHistory: [] },
    { userId: bruno.id, kind: 'recurring_bill', merchantName: 'Condomínio', amountCents: 65_000, cadenceDays: 30, priceHistory: [] },
    { userId: bruno.id, kind: 'recurring_bill', merchantName: 'Internet', amountCents: 11_520, cadenceDays: 30, priceHistory: [] },
    { userId: bruno.id, kind: 'recurring_bill', merchantName: 'Plano de celular', amountCents: 5_490, cadenceDays: 30, priceHistory: [] },
    {
      userId: bruno.id,
      kind: 'recurring_bill',
      merchantName: 'Energia',
      amountCents: 21_265,
      cadenceDays: 30,
      priceHistory: [],
      estimated: true,
    },
  ]);

  // ---------- Transações de outubro/2026 — amostra representativa (§12) ----------
  console.log('Transações (amostra)...');
  await db.insert(s.transactions).values([
    { userId: bruno.id, accountId: nubankChecking.id, postedAt: new Date('2026-10-05T09:00:00Z'), amountCents: 650_000, descriptionRaw: 'SALARIO EMPRESA XPTO', merchantName: 'Salário', categorySource: 'manual', expenseKind: 'fixed' },
    { userId: bruno.id, accountId: nubankCard.id, postedAt: new Date('2026-10-01T12:00:00Z'), amountCents: -145_000, descriptionRaw: 'ALUGUEL IMOBILIARIA', merchantName: 'Aluguel', categoryId: cat('Moradia').id, categorySource: 'user_rule', expenseKind: 'fixed' },
    { userId: bruno.id, accountId: itauCard.id, postedAt: new Date('2026-10-03T18:30:00Z'), amountCents: -81_240, descriptionRaw: 'SUPERMERCADO BOM PRECO', merchantName: 'Supermercado Bom Preço', categoryId: cat('Mercado').id, categorySource: 'ai', confidence: 0.92, expenseKind: 'variable' },
    { userId: bruno.id, accountId: nubankCard.id, postedAt: new Date('2026-10-04T20:15:00Z'), amountCents: -6_290, descriptionRaw: 'IFOOD *PIZZARIA BELLA', merchantName: 'Pizzaria Bella Massa', categoryId: cat('Delivery').id, categorySource: 'ai', confidence: 0.97, expenseKind: 'variable', note: 'Dividida com o Rafa' },
    { userId: bruno.id, accountId: nubankCard.id, postedAt: new Date('2026-10-08T13:00:00Z'), amountCents: -4_350, descriptionRaw: 'IFOOD *TEMAKERIA', merchantName: 'Temakeria', categoryId: cat('Delivery').id, categorySource: 'ai', confidence: 0.95, expenseKind: 'variable' },
    { userId: bruno.id, accountId: nubankCard.id, postedAt: new Date('2026-10-10T08:00:00Z'), amountCents: -38_620, descriptionRaw: 'POSTO COMBUSTIVEL / 99 / UBER', merchantName: 'Transporte', categoryId: cat('Transporte').id, categorySource: 'global_rule', expenseKind: 'variable' },
    { userId: bruno.id, accountId: itauChecking.id, postedAt: new Date('2026-10-11T10:00:00Z'), amountCents: -24_500, descriptionRaw: 'FARMACIA DROGASIL', merchantName: 'Drogasil', categoryId: cat('Saúde').id, categorySource: 'ai', confidence: 0.9, expenseKind: 'variable' },
    { userId: bruno.id, accountId: itauCard.id, postedAt: new Date('2026-10-08T22:00:00Z'), amountCents: -21_265, descriptionRaw: 'ENEL ENERGIA', merchantName: 'Energia', categoryId: cat('Contas da casa').id, categorySource: 'global_rule', expenseKind: 'fixed' },
  ]);

  // ---------- Agregados (§12, §6.4) ----------
  console.log('Agregados mensais...');
  await db.insert(s.monthlySummaries).values({
    userId: bruno.id,
    month: '2026-10',
    incomeCents: 650_000,
    spentCents: 391_010,
    fixedCents: 226_800,
    variableCents: 164_210,
    byCategory: {
      [cat('Moradia').id]: 145_000,
      [cat('Mercado').id]: 81_240,
      [cat('Delivery').id]: 49_870,
      [cat('Transporte').id]: 38_620,
      [cat('Outros').id]: 33_040,
      [cat('Saúde').id]: 24_500,
      [cat('Assinaturas').id]: 18_740,
    },
  });

  // Comprometido em novembro = 112.000 (parcelas) + 18.740 (assinaturas) + 103.275 (fixos) =
  // 234.015 = fatura Nubank (148.260) + fatura Itaú (85.755), como descrito no §12.
  await db.insert(s.committedByMonth).values([
    { userId: bruno.id, month: '2026-11', installmentsCents: 112_000, subscriptionsCents: 18_740, billsCents: 103_275 },
    { userId: bruno.id, month: '2026-12', installmentsCents: 198_000, subscriptionsCents: 0, billsCents: 0 },
    { userId: bruno.id, month: '2027-01', installmentsCents: 145_000, subscriptionsCents: 0, billsCents: 0 },
    { userId: bruno.id, month: '2027-02', installmentsCents: 82_000, subscriptionsCents: 0, billsCents: 0 },
  ]);

  // ---------- Plano da semana (§6.4) ----------
  await db.insert(s.weeklyPlans).values({
    userId: bruno.id,
    weekStart: '2026-10-05',
    items: [
      { type: 'subscriptions', title: 'Marcar assinaturas sem uso', description: 'Streaming de vídeo e App de idiomas estão sem uso há mais de 2 meses.', actionRoute: '/futuro/assinaturas', completed: false, completedAutomatically: false },
      { type: 'category_limit', title: 'Segurar o delivery até sexta', description: 'Você já gastou 80% do habitual em Delivery antes do dia 20.', actionRoute: '/gastos/categoria/delivery', completed: false, completedAutomatically: false },
      { type: 'goal', title: 'Separar R$ 200 para a reserva', description: 'No ritmo atual você termina a reserva em dezembro.', actionRoute: '/meta-grupo/reserva', completed: true, completedAutomatically: false },
    ],
  });

  // ---------- Alertas de exemplo (§6.9) ----------
  await db.insert(s.alerts).values([
    { userId: bruno.id, type: 'subscription_price_up', payload: { merchantName: 'Streaming de vídeo', fromCents: 3_490, toCents: 3_990 } },
    { userId: bruno.id, type: 'consent_expiring', payload: { institution: 'Itaú', expiresAt: '2026-10-12', daysLeft: 7 } },
    { userId: bruno.id, type: 'unused_subscription_reminder', payload: { merchantName: 'App de idiomas', chargeInDays: 3 }, readAt: new Date() },
  ]);

  // ---------- Metas pessoais (§12) ----------
  console.log('Metas...');
  const [reserva, limiteDelivery, viagemFimDeAno] = await db
    .insert(s.goals)
    .values([
      { ownerId: bruno.id, type: 'savings', name: 'Reserva de emergência', targetCents: 200_000, deadline: '2026-12-31' },
      { ownerId: bruno.id, type: 'category_limit', name: 'Limite de delivery', targetCents: 30_000, categoryId: cat('Delivery').id, alertAtPct: 0.8 },
      { ownerId: bruno.id, type: 'savings', name: 'Viagem de fim de ano', targetCents: 300_000 },
    ])
    .returning();
  if (!reserva || !limiteDelivery || !viagemFimDeAno) throw new Error('Falha ao criar metas');

  await db.insert(s.goalContributions).values([
    { goalId: reserva.id, userId: bruno.id, amountCents: 20_000, where: 'Poupança' },
    { goalId: viagemFimDeAno.id, userId: bruno.id, amountCents: 45_000, where: 'Caixinha' },
  ]);

  // ---------- Meta em grupo "Viagem pra Floripa" (§6.12) ----------
  const [viagemFloripa] = await db
    .insert(s.goals)
    .values([{ ownerId: bruno.id, type: 'savings', name: 'Viagem pra Floripa', targetCents: 600_000, deadline: '2027-01-15' }])
    .returning();
  if (!viagemFloripa) throw new Error('Falha ao criar meta em grupo');

  await db.insert(s.goalParticipants).values([
    { goalId: viagemFloripa.id, userId: rafa.id, targetShareCents: 150_000 },
    { goalId: viagemFloripa.id, userId: bruno.id, targetShareCents: 150_000 },
    { goalId: viagemFloripa.id, userId: julia.id, targetShareCents: 150_000 },
    { goalId: viagemFloripa.id, userId: pedro.id, targetShareCents: 150_000 },
  ]);
  await db.insert(s.goalContributions).values([
    { goalId: viagemFloripa.id, userId: rafa.id, amountCents: 90_000, where: 'Poupança' },
    { goalId: viagemFloripa.id, userId: bruno.id, amountCents: 60_000, where: 'Poupança' },
    { goalId: viagemFloripa.id, userId: julia.id, amountCents: 45_000, where: 'Poupança' },
    { goalId: viagemFloripa.id, userId: pedro.id, amountCents: 30_000, where: 'Poupança' },
  ]);

  // ---------- Casa compartilhada — Bruno e Ana, divisão pela renda 54/46 (§6.11, §12) ----------
  console.log('Casa compartilhada...');
  const [household] = await db
    .insert(s.households)
    .values([{ mode: 'couple', splitRule: 'income', createdBy: bruno.id }])
    .returning();
  if (!household) throw new Error('Falha ao criar casa');

  await db.insert(s.householdMembers).values([
    { householdId: household.id, userId: bruno.id, role: 'owner', sharePct: 0.54 },
    { householdId: household.id, userId: ana.id, role: 'member', sharePct: 0.46 },
  ]);

  await db.insert(s.householdCategories).values([
    { householdId: household.id, userId: bruno.id, categoryId: cat('Moradia').id, enabled: true },
    { householdId: household.id, userId: bruno.id, categoryId: cat('Mercado').id, enabled: true },
    { householdId: household.id, userId: ana.id, categoryId: cat('Mercado').id, enabled: true },
    { householdId: household.id, userId: ana.id, categoryId: cat('Delivery').id, enabled: true },
    { householdId: household.id, userId: bruno.id, categoryId: cat('Contas da casa').id, enabled: true },
  ]);

  // Despesas da casa usam as próprias transações de Bruno já inseridas (Moradia e Contas da
  // casa). Mercado e Delivery da Ana não existem como `transactions` de Bruno — ficam só
  // registradas aqui, já que a Ana tem a própria conta fora deste seed.
  const [moradiaTx] = await db.select().from(s.transactions).where(eq(s.transactions.merchantName, 'Aluguel'));
  const [energiaTx] = await db.select().from(s.transactions).where(eq(s.transactions.merchantName, 'Energia'));
  if (moradiaTx) {
    await db.insert(s.householdExpenses).values({ householdId: household.id, transactionId: moradiaTx.id, paidBy: bruno.id, split: {} });
  }
  if (energiaTx) {
    await db.insert(s.householdExpenses).values({ householdId: household.id, transactionId: energiaTx.id, paidBy: bruno.id, split: {} });
  }

  await db.insert(s.settlements).values({
    householdId: household.id,
    fromUser: ana.id,
    toUser: bruno.id,
    amountCents: 79_025,
    month: '2026-10',
    note: 'Pela divisão 54/46 — em aberto',
  });

  // ---------- Amigos (§12) ----------
  console.log('Amigos, desafio e acertos...');
  await db.insert(s.friendships).values([
    { userA: bruno.id, userB: ana.id, status: 'accepted' },
    { userA: bruno.id, userB: rafa.id, status: 'accepted' },
    { userA: bruno.id, userB: julia.id, status: 'accepted' },
    { userA: bruno.id, userB: pedro.id, status: 'accepted' },
    { userA: bruno.id, userB: marina.id, status: 'pending' },
  ]);

  // Desafio "30 dias sem delivery", no dia 9.
  const [challenge] = await db
    .insert(s.challenges)
    .values([
      {
        template: 'Sem delivery',
        startsAt: new Date('2026-10-01'),
        endsAt: new Date('2026-10-30'),
        rules: { durationDays: 30, restDaysPerWeek: 1, verifiedCategory: 'Delivery' },
        createdBy: bruno.id,
      },
    ])
    .returning();
  if (!challenge) throw new Error('Falha ao criar desafio');

  await db.insert(s.challengeMembers).values([
    { challengeId: challenge.id, userId: julia.id, daysDone: 9, daysFailed: 0, skipsUsed: 0 },
    { challengeId: challenge.id, userId: bruno.id, daysDone: 8, daysFailed: 0, skipsUsed: 1 },
    { challengeId: challenge.id, userId: rafa.id, daysDone: 7, daysFailed: 2, skipsUsed: 0 },
  ]);

  // "O Rafa deve R$ 31,45" — pizzaria de R$ 62,90 dividida com o Rafa.
  const [pizzariaTx] = await db
    .select()
    .from(s.transactions)
    .where(eq(s.transactions.merchantName, 'Pizzaria Bella Massa'));
  if (pizzariaTx) {
    await db.insert(s.splitExpenses).values({
      transactionId: pizzariaTx.id,
      payerId: bruno.id,
      parts: { [bruno.id]: 3_145, [rafa.id]: 3_145 },
    });
  }

  // "Você deve R$ 48,00 à Júlia" — despesa paga por ela, fora da conta do Bruno (simplificação
  // do seed: registrado direto como um acerto em aberto, sem `householdId`).
  await db.insert(s.settlements).values({
    fromUser: bruno.id,
    toUser: julia.id,
    amountCents: 4_800,
    note: 'Em aberto',
  });

  // ---------- Indicação e assinatura (§12, §6.14, §6.15) ----------
  console.log('Indicação e assinatura...');
  await db.insert(s.referrals).values({ code: 'BRUNO7K2', userId: bruno.id });

  await db.insert(s.subscriptions).values({
    userId: bruno.id,
    product: 'familia_annual',
    status: 'trialing',
    trialEnd: new Date('2026-10-11'),
    periodEnd: new Date('2026-10-11'),
    store: 'app_store',
    rcCustomerId: 'rc-sandbox-bruno',
  });

  console.log('Seed concluído.');
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
