# Progresso do Planor

> Isto **não é** o `CONTEXTO.md`. O `CONTEXTO.md` diz o que o produto **deve ser**. Este arquivo
> diz **o que já existe de verdade no código agora**, o que falta de cada fase, e — importante —
> onde o código tomou um caminho diferente do que o `CONTEXTO.md` descreve, e por quê. Serve pra
> qualquer pessoa (ou IA) entender o estado real do projeto sem ter que ler o histórico do git
> inteiro ou reconversar tudo de novo.
>
> **Regra (ver `CLAUDE.md`, Regra Nº 2): atualize este arquivo no mesmo commit que fecha ou avança
> uma fase**, antes de abrir o PR — não depois.

Última atualização: 2026-10-08.

---

## Visão geral

| Fase | Status |
|---|---|
| 0 — Base | 🟡 quase completa (falta Sentry/PostHog) |
| 1 — Interface com dados fictícios | ✅ completa |
| 2 — Conta e dados reais | 🟡 em andamento (falta Apple, PDF, Contas e cartões, jobs agendados) |
| 3 — Inteligência | ⬜ não iniciada |
| 4 — Monetização | ⬜ não iniciada |
| 5 — Juntos e crescimento | ⬜ não iniciada |

---

## Fase 0 — Base

**Feito:** monorepo pnpm + Turborepo, ESLint/Prettier/TypeScript estrito, CI no GitHub Actions
(`.github/workflows/ci.yml` roda lint/typecheck/test em todo PR), Expo Router + tokens reais do
Figma, Supabase (Auth + Postgres) e Drizzle (schema completo, 42 tabelas em `packages/db`).

**Falta:** Sentry e PostHog — nenhum dos dois está configurado ainda; nada no código os chama.
Adiado pra quando tivermos as contas/chaves (ficou junto com RevenueCat/Meta App ID, que são da
Fase 4-5).

---

## Fase 1 — Interface com dados fictícios

**Feito — completa.** Design system inteiro em `packages/ui` (botões, header, tab bar, chips,
cards, listas, sheet, diálogo, toggle, skeleton, estados vazios, ícones reais extraídos do
Figma, gráficos em SVG — Gauge, Donut, Sparkline). As 5 telas da ordem sugerida —
Home → Gastos → Futuro → IA (sem modelo) → Perfil — todas construídas e validadas contra o
protótipo do Figma.

---

## Fase 2 — Conta e dados reais

**Feito:**
- Auth por e-mail (OTP) real via Supabase, testada ponta a ponta no celular.
- Perfil e renda **editáveis de verdade** (`EditarPerfilSheet` → `PATCH /me`).
- Postgres real conectado (Supavisor pooler); `packages/db/src/seed.ts` popula dados fictícios
  do Bruno (CONTEXTO.md §12) anexados à conta real dele no Supabase Auth.
- **Home, Gastos, Futuro e Perfil lendo dados reais da API** (não mock) — ver `apps/mobile/src/lib/api/`.
  Rotas novas/estendidas: `GET /home` (sobra, comprometido, plano da semana, cards),
  `GET /spending/summary` (resumo de Gastos), `GET /future/timeline` (linha do tempo do Futuro).
- **"Ocultar valores ao abrir" persiste de verdade** (`GET`/`PATCH /settings`, tabela `settings`
  já existia no schema). Nova sheet **Segurança** (`apps/mobile/src/features/perfil/SegurancaSheet.tsx`),
  aberta a partir do Perfil, com o toggle real. `SettingsHydrator` (em `app/_layout.tsx`) aplica o
  valor salvo ao `useHiddenValuesStore` uma vez na abertura do app; o olho da Home continua
  controlando a sessão livremente depois disso. Os outros itens de Segurança do CONTEXTO.md §6.10
  (biometria, bloqueio automático, trocar e-mail, aparelhos conectados) **não** estão nessa sheet
  ainda — ficam para quando tiverem sua própria implementação.
- **Login com Google implementado** (`AuthProvider.signInWithGoogle`, em
  `apps/mobile/src/lib/auth/AuthProvider.tsx`) — Supabase gerencia o fluxo OAuth inteiro (client
  Web no Google Cloud, sem precisar de package Android/bundle iOS ainda); o app abre o navegador
  do sistema (`expo-web-browser` + `expo-auth-session`) e recebe a sessão de volta pelo deep link.
  Botão real em "Criar conta". **Testado no celular e confirmado que o Expo Go não serve pra esse
  fluxo** — a sessão sempre cancela com `ASWebAuthenticationSessionErrorCode.canceledLogin` depois
  de escolher a conta no Google (limitação documentada do próprio Expo: custom URL schemes de
  OAuth não funcionam de forma confiável no Expo Go). Precisa de um **build de desenvolvimento**
  (`expo-dev-client`, já instalado como dependência) pra validar de verdade — em andamento,
  bloqueado por instalar o Xcode completo (só as Command Line Tools estavam presentes).
  `AuthProvider.tsx` tem logs de diagnóstico temporários (`console.log('[google-auth]...`) que
  devem sair assim que o fluxo for validado pelo build de desenvolvimento.
- **Transações (lista) e Detalhe da transação construídas com dado real** — essas telas nunca
  tinham sido feitas, nem com mock, apesar do `PROGRESSO.md` antigo marcar a Fase 1 como completa
  (havia um TODO no código confirmando isso: `gastos.tsx`, "próxima da Fase 1"). Novo:
  - `GET /categories`, `GET /accounts` (leitura simples, independentes do Pluggy/`connections.ts`);
  - `GET /transactions` (filtros: mês, tipo, busca por nome/valor, contas, categorias, faixa de
    valor) e `GET /transactions/:id`, ambos com dado real (`apps/api/src/routes/transactions.ts`);
  - `PATCH /transactions/:id` (categoria, tipo de gasto, ocultar, nota) e `POST /category-rules`
    ("Mudar categoria" → "Aplicar a compras parecidas" cria uma regra pra próximas transações do
    mesmo comerciante — **não reclassifica as já existentes agora**, só o que a frase do
    CONTEXTO.md §6.5 pede ao pé da letra);
  - telas novas `apps/mobile/app/gastos/transacoes.tsx` e `apps/mobile/app/gastos/transacao/[id].tsx`,
    com as 4 sheets/estados do §6.5 que fazem sentido sem Pluggy/Fase 3/Fase 5 (ver "Decisões
    diferentes" abaixo pro que ficou de fora).
  - `monthRangeSaoPaulo` novo em `packages/shared/src/dates.ts` (com teste), pra filtrar
    `postedAt` pelo mês certo em America/Sao_Paulo (CLAUDE.md, princípio 5).
- **Importar fatura — só OFX por enquanto** (CONTEXTO.md §6.2). `parseOfx` novo em
  `packages/shared/src/ofx.ts` (com teste) — parser SGML simples (id, data, valor, descrição; não
  lê saldo/juros, que não interessam aqui). `POST /imports` (`apps/api/src/routes/connections.ts`,
  usa `@fastify/multipart`) recebe o arquivo + `accountId` de uma conta já existente do usuário,
  insere as transações e deduplica de graça pelo índice único já existente
  (`accountId` + `externalId`). Tela nova `apps/mobile/app/perfil/importar-fatura.tsx`
  (`expo-document-picker`), aberta a partir de Perfil → "Importar fatura ou extrato". PDF
  devolve `501` de propósito (ver "Decisões diferentes" abaixo).
- **Pluggy (Open Finance) implementado** — plano "Meu Pluggy" (decisão §15.1, ver CONTEXTO.md
  §6.2). `apps/api/src/lib/pluggy.ts` (cliente HTTP: auth, connect token, items, contas,
  transações, registrar webhook) e `apps/api/src/lib/pluggySync.ts` (grava item+contas+cartão+
  transações no banco, idempotente — índices únicos novos em `accounts.external_id`,
  `connections.aggregator_item_id` e `institutions.aggregator_id`, migração
  `0001_steep_agent_brand.sql`). Rotas reais: `POST /connections/token`,
  `POST /connections/sync-item` (chamado pelo app logo após conectar, não depende do webhook já
  estar registrado), `GET /connections`, `POST /connections/:id/sync`, `DELETE /connections/:id`,
  `POST /webhooks/aggregator` (só processa eventos `item/*`, que vêm com `clientUserId` — ver
  "Decisões diferentes"). Mobile: `apps/mobile/app/perfil/conectar-banco.tsx`, usando o SDK
  oficial `react-native-pluggy-connect` (funciona no Expo Go — é só WebView por baixo, não
  precisa do build de desenvolvimento que o Google exige).
  **Validado ponta a ponta em 2026-10-07** com o Nubank de verdade do Bruno (via Meu Pluggy):
  conta corrente + cartão de crédito sincronizados, 857 transações importadas, valores e sinais
  corretos, nova sincronização não duplica nada. Achado e corrigido nesse teste: `GET /transactions`
  (página/pageSize) estava descontinuado pelo Pluggy (410) — trocado por `GET /v2/transactions`
  com cursor (`lib/pluggy.ts`, `listTransactions`). Único ponto que o teste real não cobriu: o
  sinal do valor numérico em conta tipo `BANK` (não precisou confiar nisso — a importação usa o
  campo explícito `DEBIT`/`CREDIT` do Pluggy).
  **Observação importante sobre "Meu Pluggy":** o widget não mostra o conector de testes
  "Pluggy Bank" nem bancos reais direto — só aparece "MeuPluggy", que dá acesso às contas que o
  próprio usuário já conectou em meu.pluggy.ai (um app separado). Ou seja, esse plano gratuito só
  serve pra conectar **a própria conta de quem tem as credenciais** (hoje, só o Bruno) — não dá
  pra outro usuário (Ana, por exemplo) conectar o banco dele pelo Planor com essas credenciais.
  Validar com os sócios se isso é aceitável pro beta fechado ou se precisa de um plano de
  desenvolvedor de verdade antes de abrir pra mais gente (ver CONTEXTO.md §15.1).
- **Falha de autorização encontrada e corrigida em `syncItem`** (`pluggySync.ts`) — depois de
  conectar o banco de verdade, foi feita uma auditoria completa (a pedido do Bruno) de toda rota
  que toca dado financeiro. `POST /connections/sync-item` recebia o `itemId` do Pluggy direto do
  corpo da requisição, sem conferir se esse item pertencia mesmo a quem estava chamando — um
  usuário malicioso que soubesse (ou adivinhasse) o `itemId` de outra pessoa podia, em teoria,
  fazer os dados bancários dela aparecerem associados à própria conta dele. Corrigido com duas
  travas em `syncItem` (que agora protege TODOS os caminhos que sincronizam, não só essa rota):
  confere o `clientUserId` que o próprio Pluggy devolve no item contra quem está pedindo, e
  confere de novo contra o dono já registrado no nosso banco, se houver. Testado dos dois lados
  (dono de verdade sincroniza normalmente; usuário errado é recusado com 403). Resto da API
  (`/transactions`, `/accounts`, `/categories`, `/me`, `/settings`, `/connections`, `/imports`)
  auditado na mesma passada — todas as rotas que devolvem ou alteram dado já filtravam por
  `userId` corretamente; essa foi a única falha encontrada.

- **Pipeline de processamento + fila pg-boss** (CONTEXTO.md §6.3 passos 1, 2 e 9; §9) — Home e
  Gastos agora mostram o dinheiro real, não mais o agregado fixo do seed:
  - Regras puras em `packages/shared/src/pipeline/` (com teste): `normalizeMerchantName` (tira
    prefixo de intermediador tipo `Ebn *`/`Mp *`/`Ifd*`, sufixo de parcela `3/10`, contraparte do
    Pix depois do `|`), `categorizeTransaction` (regras do usuário → dicionário global
    `GLOBAL_CATEGORY_RULES`, por palavra inteira, ordem importa), `isCardBillPayment`
    (pagamento de fatura nos dois lados + "Saldo em atraso/rotativo" viram `isTransfer`) e
    `buildMonthlySummaries` / `trendVsPreviousPct`.
  - `apps/api/src/services/processTransactions.ts` aplica isso no banco (UPDATE em lote) e
    regrava `monthly_summaries` de todos os meses até hoje. Idempotente (segunda passada: 0
    linhas). Nunca sobrescreve categoria `manual`/`ai` nem `expenseKind` já preenchido.
  - pg-boss configurado (`apps/api/src/jobs/`), workers rodando no mesmo processo da API, schema
    `pgboss` criado no Supabase. Funciona pelo pooler (porta 6543). Filas `sync-connection` e
    `process-transactions` (política `stately`, uma por usuário).
  - Quem enfileira `process-transactions`: fim de todo `syncItem`, `POST /imports`,
    `PATCH /transactions/:id` e `POST /category-rules`. O webhook do Pluggy agora só enfileira
    `sync-connection` e responde na hora (§8, "enfileira jobs").
  - Script `pnpm --filter @planor/api pipeline:reprocess <email>|--all` roda o pipeline sem fila
    (backfill, ou depois de mexer no dicionário).
  - Tendência "vs. mês anterior" (Home e Gastos) agora é real — existe mais de um mês. O app
    mostra verde quando o gasto caiu e vermelho quando subiu (antes era sempre "+" vermelho).
  - Bug corrigido: `GET /spending/summary` não filtrava por mês (pegava a primeira linha do
    usuário) — só não aparecia porque só existia um mês.
  - **Rodado na conta do Bruno em 2026-10-08:** 812 transações atualizadas, 13 meses
    recalculados (out/2025 a out/2026). Cobertura do dicionário: ~30% das saídas reais ficam
    categorizadas; o resto cai em "Outros" (maior bloco: "Tiktok", 148 transações, ~R$ 8,8 mil,
    de propósito sem regra global — ver "Decisões diferentes").
  - As 8 transações fictícias do seed na conta do Bruno (contas sem `external_id`: Nubank,
    Nubank Cartão, Itaú, Itaú Cartão) foram marcadas **ocultas** a pedido dele, pra não misturar
    aluguel/salário inventados com o dado real. Continuam no extrato; reversível.

**Falta:**
- Login com Apple — precisa do Apple Developer Program (US$99/ano), que ainda não existe.
- Segurança: biometria, bloqueio automático ao sair do app, trocar e-mail e aparelhos conectados
  — só "Ocultar valores ao abrir" é real por enquanto (ver acima).
- Pluggy: validado ponta a ponta (ver "Feito" acima). O que falta em volta disso: tela de lista
  "Contas e cartões" com detalhe de cada conexão (CONTEXTO.md §6.10) — hoje só o contador no card
  do plano usa dado real, a lista propriamente dita continua mock; avisos de consentimento
  vencendo (7 e 1 dia antes) e a tela "Renovar acesso"; atualização automática a cada 4-6h (job agendado —
  a fila pg-boss já existe, ver "Feito"); eventos `transactions/*` do webhook (hoje só
  `item/*` é processado — ver "Decisões diferentes"); limpar a conexão duplicada vazia que sobrou dos testes
  (sem urgência, é dado de dev).
- Importar fatura em **PDF** — precisa de extração de texto + LLM pra estruturar em JSON
  validado com zod (CONTEXTO.md §6.2), e o provedor de IA final ainda é decisão em aberto
  (CONTEXTO.md §15.6). `POST /imports` já devolve `501` com uma mensagem clara pra esse caso.
- Pipeline, passo 2.3 (LLM barato pro que as regras não pegam) — depende do provedor de IA
  (CONTEXTO.md §15.6). Hoje ~70% das saídas reais ficam sem categoria ("Outros").
- Pipeline, passos 4–8 (parcelas, recorrências, fixo/variável por recorrência, fora do padrão) e
  o resto do passo 9 (`committed_by_month`, previsão da sobra, plano da semana) — são Fase 3.
  `committed_by_month`, `recurrences` e `installment_plans` continuam vindo do seed.
- Jobs agendados do §9: `sync-connection` a cada 4-6h e `consent-expiry-check` (a fila já existe,
  falta o `boss.schedule`).
- O app não espera o job terminar: depois de "Mudar categoria"/ocultar/sincronizar, a Home pode
  mostrar o número antigo por alguns segundos até o próximo refetch.
- Detalhe da categoria (`GET /spending/category/:id`, gráfico dos últimos 6 meses) — **agora
  desbloqueado**: `monthly_summaries` tem 13 meses reais com `byCategory`.
- IA (`apps/mobile/app/(tabs)/ia.tsx`) continua 100% mockada — não é uma lacuna de "dados reais"
  como as outras, é que a função em si (chat com function calling) é escopo da Fase 3.
- Perfil: o bloco de usuário/plano, o formulário de edição e o toggle de Segurança são reais. Os
  grupos "Conta" (contas conectadas), o resto de "Preferências" (notificações, privacidade) e
  "Juntos" (casa/amigos/indicação) continuam com texto de exemplo de `lib/mocks/perfil.ts` —
  dependem de Pluggy/Fase 5.

---

## Decisões diferentes do `CONTEXTO.md` original (e por quê)

- **Tendência "vs. mês anterior"** (Home e Gastos) continua `null` quando o mês anterior não tem
  gasto em `monthly_summaries` — nunca inventa número. Com o pipeline rodando, isso só acontece
  no primeiro mês de dados de um usuário. Atenção: no começo do mês ela compara um mês parcial com
  um mês inteiro, então tende a vir bem negativa (ex.: dia 8 → "-93%"). Não é bug de conta; se
  incomodar, a alternativa é comparar com o mesmo dia do mês anterior (decisão de produto).
- **`GET /spending/summary` lê de `monthly_summaries`, não soma `transactions` ao vivo** — mesmo
  agregado que o `/home` usa, agora recalculado de verdade pelo pipeline.
- **Gasto do mês só conta transação com data até hoje** — o Pluggy já devolve as próximas parcelas
  do cartão com data futura (ex.: "PagTesouro 12/12" em mar/2027). Isso é "comprometido" (Fase 3),
  não gasto; por isso `monthly_summaries` só vai até o mês atual.
- **"Saldo em atraso" / "Saldo em rotativo" do cartão viram `isTransfer`** — o CONTEXTO.md não
  cita isso. É o saldo da fatura anterior levado pra próxima: as compras já contaram no mês em
  que aconteceram, contar de novo duplicaria (~R$ 3,2 mil na conta do Bruno). Juros e multa de
  atraso continuam contando como gasto.
- **Dicionário global é conservador** — só nome inequívoco. "Tiktok" (loja, moedas ou anúncio?),
  restaurantes/lanchonetes (não existe categoria "Restaurantes" no §6.3, passo 3) e pessoas
  físicas ficam sem regra global; o usuário corrige com "Mudar categoria" → vira regra dele.
- **"Aplicar a compras parecidas" agora reclassifica também as transações já existentes** (antes
  só valia pras próximas). Acontece naturalmente: criar a regra enfileira o pipeline, que aplica a
  regra a tudo que não foi categorizado à mão. Bate melhor com o texto do §6.5.
- **Transferência entre contas próprias (Pix pra si mesmo) não é detectada** — só pagamento de
  fatura. Sem o CPF da contraparte (o Pluggy tem em `paymentData`, mas não guardamos), comparar
  pelo nome é frágil. Na conta do Bruno, isso faz o Pix que ele recebe do próprio MEI contar como
  renda (o que é defensável) e os que ele envia pra si mesmo contarem como gasto.
- **`categories.default_kind` estava bugado no seed** (toda categoria nascia `'variable'`,
  mesmo Moradia/Saúde/Assinaturas). Corrigido pra bater com os números do CONTEXTO.md §12 — não
  é uma decisão de produto, foi um bug mesmo, achado ao validar `/spending/summary`.
- **Futuro mostra 4 meses no gráfico de barras ("até fevereiro"), não 6 ("até abril")** — o mock
  da Fase 1 tinha 2 meses extras (mar/abr) que vieram só do protótipo do Figma, sem número
  correspondente no CONTEXTO.md §12. O seed só populou `committed_by_month` pra 4 meses reais.
  Dado real > mock inventado aqui.
- **Ícone de "olho fechado"** (ocultar valores) não existe no Figma — só `Ícone/Olho` existe, sem
  variante riscada. Em vez de desenhar um glifo novo (proibido — ver convenção de ícones no
  `packages/ui/src/icons/registry.ts`), um traço diagonal é sobreposto ao ícone real quando
  oculto. Troca pelo ícone de verdade se um dia o Figma ganhar um.
- **Animação de entrada dos gráficos "só quando aparece na tela" (`useRevealProgress` +
  `RevealScrollView`, em `packages/ui`)** — não é algo que o CONTEXTO.md pede; foi um pedido
  direto do Bruno durante o desenvolvimento (gráficos abaixo da dobra devem animar só quando o
  scroll chega neles, uma vez por visita à tela, não a cada vez que rola pra cima/baixo).
- **Detalhe da transação não tem "Marcar como recorrente", contexto da IA, "Despesa da casa" nem
  "Dividir com amigos"** (todos citados no CONTEXTO.md §6.5) — os dois primeiros depende do motor
  de recorrência/IA da Fase 3; os dois últimos de casa/amigos, que são Fase 5 e ainda mock no
  Perfil. Incluir qualquer um deles agora seria ou texto fabricado (iria contra o princípio "a IA
  nunca faz conta") ou uma tela sem backend nenhum por trás. Ficam pra quando a fase correspondente
  chegar.
- **Buscas recentes** (CONTEXTO.md §6.5, busca de Transações) não foi implementado — a busca por
  nome/valor funciona, só não guarda histórico de buscas. Corte de escopo por tempo, não por
  dependência de outra fase; pode entrar numa iteração futura sem mexer em mais nada.
- **Importar fatura só anexa a uma conta já existente do usuário** — o CONTEXTO.md §6.2 não deixa
  explícito se importar fatura pode criar uma conta/banco do zero (fluxo de onboarding, "prefiro
  importar uma fatura", pra quem ainda não tem nenhuma conta). Criar conta do zero exigiria
  modelar uma `connections`/`institutions` só pra isso, que é essencialmente o mesmo desenho que o
  Pluggy vai precisar — melhor fazer junto, não duplicado. Por enquanto, Importar fatura só
  aparece no Perfil (que já pressupõe pelo menos uma conta) — não no onboarding.
- **Normalização de descrição em Importar fatura é só mecânica** (espaço, Title Case) — o exemplo
  do CONTEXTO.md §6.3 ("IFOOD *PIZZARIA BELLA" → "Pizzaria Bella Massa") exige saber o nome real
  do estabelecimento, que só um dicionário de comerciantes ou IA resolve (ver item do pipeline
  automático, acima). Sem isso, vira "Ifood *pizzaria Bella" em vez do nome comercial bonito.
- **Webhook do Pluggy só processa eventos `item/*`** — segundo a documentação do Pluggy, só esses
  eventos vêm com `clientUserId` no payload (é assim que sabemos de qual usuário é a atualização).
  Eventos `transactions/*` só trazem `transactionIds`/`accountId`. A fila (pg-boss) já existe; o
  que falta é achar o dono pelo `itemId` na tabela `connections` e enfileirar `sync-connection`.
  Na prática, isso não trava nada agora: `item/updated` (que processamos) dispara nos mesmos
  ciclos de sincronização que trazem transação nova.
- **API do Pluggy foi implementada a partir da documentação pública, depois validada contra uma
  conexão real** (ver "Feito" acima) — `GET /accounts` usa mesmo `results` como documentado, mas
  `GET /transactions` estava descontinuado (410) e foi trocado por `GET /v2/transactions` com
  cursor. O sinal do valor em conta `BANK` não precisou ser confirmado: a importação sempre usou
  o campo explícito `DEBIT`/`CREDIT` do Pluggy em vez do sinal numérico, por precaução — e isso
  se confirmou a decisão certa.
- **`POST /webhooks/aggregator` não verifica assinatura criptográfica** — o Pluggy não assina o
  payload do webhook (confirmado na documentação deles). A única verificação possível é um header
  customizado que a gente mesmo define ao registrar o webhook (`PLUGGY_WEBHOOK_SECRET`,
  `lib/pluggy.ts` → `registerWebhook`), não uma assinatura HMAC de verdade.

---

## Ambiente local — cada pessoa configura o próprio

Ver `CONTRIBUTING.md` (seção "Ambiente de desenvolvimento") pro passo a passo completo. Resumo:
o banco de dados e o Pluggy são **compartilhados** (mesmo projeto Supabase/sandbox pros dois), mas
a API e o Expo rodam **localmente na máquina de cada um** — isso significa que `EXPO_PUBLIC_API_URL`
no `.env` de cada pessoa aponta pro IP da própria rede Wi-Fi, nunca pro IP de outra pessoa.
