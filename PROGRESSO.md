# Progresso do Planor

> Isto **não é** o `CONTEXTO.md`. O `CONTEXTO.md` diz o que o produto **deve ser**. Este arquivo
> diz **o que já existe de verdade no código agora**, o que falta de cada fase, e — importante —
> onde o código tomou um caminho diferente do que o `CONTEXTO.md` descreve, e por quê. Serve pra
> qualquer pessoa (ou IA) entender o estado real do projeto sem ter que ler o histórico do git
> inteiro ou reconversar tudo de novo.
>
> **Regra (ver `CLAUDE.md`, Regra Nº 2): atualize este arquivo no mesmo commit que fecha ou avança
> uma fase**, antes de abrir o PR — não depois.

Última atualização: 2026-10-10.

---

## Visão geral

| Fase | Status |
|---|---|
| 0 — Base | 🟡 quase completa (falta Sentry/PostHog) |
| 1 — Interface com dados fictícios | ✅ completa |
| 2 — Conta e dados reais | 🟡 em andamento (falta PDF, Contas e cartões, jobs agendados; Apple adiado) |
| 3 — Inteligência | 🟡 em andamento (parcelas, assinaturas, comprometido, sobra e plano da semana prontos) |
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
  OAuth não funcionam de forma confiável no Expo Go). **Validado em 2026-10-10 no build de
  desenvolvimento iOS** (`expo-dev-client`, simulador iPhone 17): escolhe a conta no Google e cai
  logado na Home. Os logs de diagnóstico temporários (`[google-auth]`) já saíram do
  `AuthProvider.tsx`.
- **Build de desenvolvimento iOS funcionando** (`pnpm --filter mobile ios` = `expo run:ios`, que
  roda o prebuild, compila no Xcode e sobe o Metro). Bundle ID `com.planor.app`, só iPhone
  (`supportsTablet: false`). A pasta `apps/mobile/ios/` é gerada e fica fora do git. Duas
  pegadinhas que travaram a primeira compilação:
  - **O repositório não pode ficar numa pasta sincronizada pelo iCloud** (`~/Desktop`,
    `~/Documents` com "Mesa e Documentos" ligado). O iCloud põe atributos estendidos nos arquivos e
    o `codesign` falha com "resource fork, Finder information, or similar detritus not allowed".
    Clonar em `~/Developer/` ou outra pasta fora do iCloud.
  - **Xcode 27 exige o ciclo de vida por cenas (UIScene)**, que o template do Expo SDK 57 ainda
    não usa. Sem isso o app fecha ao abrir. O config plugin `apps/mobile/plugins/withIosSceneLifecycle.js`
    resolve; apagar o plugin quando subir pro Expo SDK 58.
  - Pra instalar no iPhone físico, falta escolher um Team de assinatura no Xcode (Apple ID grátis
    funciona, mas o app expira em 7 dias). Até agora só foi testado no simulador.
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

- **Jobs agendados das conexões** (CONTEXTO.md §6.2, §6.9, §9) — `apps/api/src/services/connectionJobs.ts`:
  - `sync-all-connections` a cada 6h (`0 */6 * * *`, America/Sao_Paulo): pede atualização ao
    Pluggy (`requestItemRefresh`, `PATCH /items/{id}`) e agenda a leitura (`sync-connection`) pra
    3 min depois — ou na hora, se o Pluggy recusar o pedido (ver "Decisões diferentes": Meu
    Pluggy não aceita). Não depende do webhook/ngrok.
  - `consent-expiry-check` diário às 9h: alerta `consent_expiring` nos marcos de 7 e 1 dia
    (`checkConsent` em `packages/shared/src/calculations/consentExpiry.ts`, com teste — por janela,
    então se o job perder o dia exato o aviso sai no dia seguinte), sem duplicar e "zerando"
    quando o acesso é renovado (dedup pela data de vencimento). Vencido vira `consent_expired`.
  - Alertas `sync_failed` (conexão foi pra `error`) e `bank_disconnected` (consentimento venceu)
    na **transição** de status, dentro do `syncItem` — não a cada rodada.
  - `sync-connection` com retry e intervalo crescente (`retryBackoff`, 5 tentativas, §6.2).
    Item que não existe mais no Pluggy (404, ou id inválido) vira `disconnected` e para de tentar.
  - "Atualizar agora" (`POST /connections/:id/sync`) também pede atualização ao Pluggy antes de
    ler, e agenda uma segunda leitura; devolve `refreshRequested`.
  - Testado em 2026-10-08 contra o banco real: as duas rodadas rodaram, a conexão real do Nubank
    (Meu Pluggy) foi relida pela rodada, e as conexões **falsas do seed** (`item-nubank-1`,
    `item-itau-1`, ids inventados) foram marcadas `disconnected` — o contador "bancos conectados"
    do Perfil caiu de 4 pra 2 (as 2 reais; uma é a duplicada vazia que já estava na lista).
  - Push ainda não existe (`push-dispatcher`, Expo Notifications) e a central de alertas
    (`GET /alerts`) continua stub: por enquanto os alertas novos só aparecem no contador do sino
    da Home.

- **Contas e cartões e telas de conexão** (CONTEXTO.md §6.2, §6.10; Figma 34:785, 53:1306,
  53:1357, 83:2270, 83:2288, 83:2329):
  - `GET /connections` agora devolve as contas de cada conexão (saldo; no cartão, a fatura atual
    — ver "Decisões diferentes") e `authorizedAt` e `consentDaysLeft` (mesma regra do job de
    consentimento, calculada no servidor).
  - Telas novas: `app/perfil/contas.tsx` (lista por banco; card vermelho "Reconectar" quando
    venceu; toque numa conexão com erro abre a sheet "Não conseguimos atualizar"; vencendo em
    até 7 dias leva pra "Acesso vencendo"), `app/perfil/conexao/[id].tsx` (status, validade,
    dados, finalidade, "Atualizar agora" e "Desconectar" com diálogo),
    `app/perfil/acesso-vencendo/[id].tsx` e `app/perfil/renovar/[id].tsx`. O Perfil abre a lista
    pelo item "Contas e cartões". Rotas novas registradas no CONTEXTO.md §5.
  - Renovar/Reconectar reaproveita `conectar-banco.tsx` com `?connectionId=` (widget do Pluggy
    em modo atualização do mesmo item).
  - **Falha de segurança corrigida:** `POST /connections/token` aceitava um `itemId` cru do
    cliente sem conferir o dono — dava pra abrir o widget em modo atualização sobre o item de
    outra pessoa. Agora recebe `connectionId` e resolve o item no servidor filtrando pelo usuário
    (404 se não for dele). Testado via HTTP com sessão real dos dois lados.
  - `packages/ui`: `SecondaryButton` novo (Botão/Secundário) e ícones `mais`, `usuario`, `cartao`
    (paths reais exportados do Figma).
  - `apiFetch` (mobile) não manda mais `Content-Type: application/json` sem corpo (o Fastify
    recusava o DELETE com 400) e aceita resposta 204.

- **Detalhe da categoria** (CONTEXTO.md §6.5, Figma 28:396) — `GET /spending/category/:id?month=`
  (era stub 501) e tela `app/gastos/categoria/[id].tsx`, aberta tocando numa categoria do resumo
  de Gastos. Total do mês e barras dos 6 meses vêm de `monthly_summaries` (batem com o resumo);
  contagem, ticket médio e lista vêm das transações com os mesmos filtros do pipeline. "Outros"
  inclui as sem categoria. Média dos 6 meses só conta meses em que já havia dado
  (`monthlyAverageCents` em `packages/shared`, com teste). Validado via HTTP com dado real: o
  total de cada categoria bate com a soma das transações listadas.
  `TransactionRow` ganhou `subtitle`/`amountCaption` opcionais (data e conta, como no Figma) e
  `ScreenGlow` foi pra `src/components` (agora usado por Gastos e Contas).

**Falta:**
- Build de desenvolvimento no iPhone físico (precisa de Team de assinatura no Xcode) e no
  Android (`expo run:android` nunca foi rodado). O login com Google só foi testado no simulador iOS.
- Login com Apple — **adiado por decisão do Bruno (2026-10-10)**. Precisa do Apple Developer
  Program (US$99/ano), que ainda não existe. Só volta quando a conta for assinada.
- Segurança: biometria, bloqueio automático ao sair do app, trocar e-mail e aparelhos conectados
  — só "Ocultar valores ao abrir" é real por enquanto (ver acima).
- Pluggy: validado ponta a ponta, e as telas de Contas e cartões existem (ver "Feito"). O que
  falta em volta disso: eventos `transactions/*` do webhook (hoje só
  `item/*` é processado — ver "Decisões diferentes").
- **Limpeza da conta do Bruno, 2026-10-10 (com OK dele):** apagadas as 2 conexões "MeuPluggy"
  duplicadas, sem contas (também os itens no Pluggy), e o "Banco Inter" do seed (sem dados). Ficou
  só a conexão MeuPluggy real (`5c462e1c…`, com as duas contas). O Itaú e o Nubank do seed
  saíram depois, na Fase 3 (ver lá). Do seed, só o `weekly_plans` ainda está na conta do Bruno.
  Atenção: rodar `db:seed` de novo recria tudo isso.
- Importar fatura em **PDF** — precisa de extração de texto + LLM pra estruturar em JSON
  validado com zod (CONTEXTO.md §6.2). O provedor já está escolhido (Claude, 2026-10-12); falta
  fazer. `POST /imports` já devolve `501` com uma mensagem clara pra esse caso.
- Pipeline, passo 2.3 — feito na Fase 3 (ver "Categorização por IA" lá).
- Pipeline, passos 5–8 e o resto do passo 9 — viraram Fase 3 (ver a seção dela abaixo).
- Push (Expo Notifications + `push-dispatcher`, §9) e central de alertas (`GET /alerts`, §6.9) —
  os alertas de conexão já são gravados, mas só aparecem no contador do sino.
- O app não espera o job terminar: depois de "Mudar categoria"/ocultar/sincronizar, a Home pode
  mostrar o número antigo por alguns segundos até o próximo refetch.
- Detalhe da categoria: falta a "dica da IA" com "Criar limite" (Fase 3) e o lápis de "Editar
  categoria" (nome, ícone, fixo/variável, incluir nas análises — sheet ainda não existe).
- IA (`apps/mobile/app/(tabs)/ia.tsx`) continua 100% mockada — não é uma lacuna de "dados reais"
  como as outras, é que a função em si (chat com function calling) é escopo da Fase 3.
- Perfil: o bloco de usuário/plano, o formulário de edição e o toggle de Segurança são reais. Os
  grupos "Conta" (contas conectadas), o resto de "Preferências" (notificações, privacidade) e
  "Juntos" (casa/amigos/indicação) continuam com texto de exemplo de `lib/mocks/perfil.ts` —
  dependem de Pluggy/Fase 5.

---

## Fase 3 — Inteligência

**Feito:**
- **Parcelas (§6.3, passo 4)** — `detectInstallmentPlans` em
  `packages/shared/src/pipeline/installments.ts` (com teste). Lê "n de m" do Pluggy (que manda
  número, total e mês da fatura de cada parcela de cartão — colunas novas
  `transactions.installment_number`, `installment_count` e `bill_month`, migração
  `0004_pretty_energizer.sql`, já aplicada; a sincronização preenche também nas transações que já
  existiam) e, sem isso, o sufixo da descrição ("3/10", "PARC 03/10", "PARCELA 3 DE 10"). Agrupa
  por conta + estabelecimento + total de parcelas + mês da 1ª parcela. O job `process-transactions`
  grava os parcelamentos ativos em `installment_plans` (atualiza no lugar os que já existiam,
  apaga os que terminaram) e liga cada parcela a eles (`transactions.installment_plan_id`).
- **Comprometido (§6.3, passo 9)** — `projectCommittedByMonth` em
  `packages/shared/src/calculations/committedByMonth.ts` (com teste): próximos 6 meses, a partir do
  mês seguinte, com parcelas (valor real de cada parcela quando ela já existe como transação) +
  recorrências ativas. Recalculado no mesmo job; `committed_by_month` não vem mais do seed.
- **Assinaturas e fixos recorrentes (§6.3, passo 5)** — `detectRecurrences` em
  `packages/shared/src/pipeline/recurrences.ts` (com teste). Mesmo comerciante, intervalo de 28 a
  35 dias, valor ±10%, pelo menos 2 cobranças, e cobrança nos últimos 45 dias. Assinatura vs. fixo
  recorrente pela categoria (Moradia, Contas da casa, Educação e Saúde → fixo; o resto,
  assinatura). Fixo recorrente vale a média das 3 últimas cobranças (`estimated` quando variam).
  O job grava em `recurrences` (atualiza no lugar, mantém "Já cancelei") e liga as cobranças
  (`transactions.recurrence_id`). As 12 recorrências fictícias do seed saíram. Na conta do Bruno:
  Spotify, Crunchyroll, Claude, Melimais, Adoreshare e Framer (R$ 135,31/mês) + Conta Vivo
  (R$ 85,80, estimada); comprometido de novembro R$ 419,47, sem nenhum número do seed.
- **"A vencer" na sobra prevista (§6.4)** — `dueUntilMonthEnd` em
  `packages/shared/src/calculations/dueUntilMonthEnd.ts` (com teste): transações com data entre
  agora e o fim do mês (as próximas parcelas que o Pluggy já devolve com data futura) + próximas
  cobranças das recorrências ativas até o fim do mês (atrasada até 5 dias ainda conta). `GET /home`
  usa no mês corrente (antes era sempre 0). Na conta do Bruno em 10/10: R$ 73,03 de parcelas +
  R$ 115,41 de assinaturas = R$ 188,44; sobra R$ 6.041,14.
- **"Compras ainda não detalhadas pelo banco"** (decisão do Bruno em 2026-10-10): a parte da
  fatura aberta que o banco ainda não mandou como transação entra no gasto do mês corrente (Home e
  Gastos), como uma linha própria em Gastos ("Ainda não detalhadas", sem categoria).
  `undetailedBillCents` em `packages/shared` (com teste) = fatura atual − gastos da fatura aberta
  já recebidos; calculada na sincronização e gravada em `credit_cards.undetailed_cents` (migração
  `0005_quiet_medusa.sql`, já aplicada). Na conta do Bruno: R$ 1.410,07 → gasto de outubro
  R$ 1.814,66, sobra R$ 4.631,07. Vale 0 sem fatura fechada conhecida e quando não há lançamento
  conhecido na fatura aberta (desde a "Fatura do cartão", abaixo, a fatura fechada ainda não paga
  é descontada do limite usado, então o valor não depende mais de ela ter vencido).
- **"Como calculamos a sobra" (§6.4, Figma 83:2405)** — tela nova `apps/mobile/app/sobra.tsx`,
  aberta ao tocar no valor da sobra na Home. `GET /forecast/leftover` (rota nova,
  `apps/api/src/routes/forecast.ts`) devolve a mesma conta da Home aberta em parcelas: renda, já
  gasto (com as compras não detalhadas), a vencer por tipo e a sobra. A consulta do "a vencer"
  saiu da rota da Home pra `apps/api/src/services/dueThisMonth.ts`, usada pelas duas.
  "Ajustar minha renda" abre a sheet de Editar perfil. Ícones `entrada` e `editar` adicionados ao
  `packages/ui` (paths reais do Figma).
- **Plano da semana real (§6.4, Figma 47:1163)** — `buildWeeklyPlan`/`evaluateWeeklyPlan` em
  `packages/shared/src/calculations/weeklyPlan.ts` (com teste). Tipos de item combinados com o
  Bruno em 2026-10-10: informar a renda (conclui sozinho), separar o valor da fatura que vence na
  semana (o usuário marca), segurar uma categoria variável acima do ritmo dos últimos 3 meses
  (limite da semana + quanto já foi; o usuário marca) e categorizar as 10 maiores compras do mês
  sem categoria (conclui sozinho). No máximo 3, nessa ordem. `apps/api/src/services/weeklyPlan.ts`
  gera o plano da semana quando ainda não existe (ou é de formato antigo, como o do seed — que
  foi substituído no lugar), avalia ao vivo e grava. Rotas novas `GET /weekly-plan` e
  `PATCH /weekly-plan/items/:index` (a marcação à mão antes se perdia). Job `weekly-plan`
  agendado pra segunda, 6h. Tela nova `apps/mobile/app/plano-semana.tsx`, aberta pelo card da
  Home; o card agora grava a caixa de seleção. Valores dentro de textos (título "Separar R$ …")
  obedecem ao olho (`useMaskedMoneyText`). Token `cardDestaque` extraído do Figma pro
  `packages/ui`. Na conta do Bruno, semana de 5 a 11/10: "Categorizar 8 compras sem categoria".
- **Telas de Parcelas (§6.6, Figma 30:592 e 31:519)** — `apps/mobile/app/futuro/parcelas.tsx`
  (resumo por mês/falta pagar/último mês + lista com progresso) e
  `apps/mobile/app/futuro/parcela/[id].tsx` (anel, linha do tempo das parcelas, total, já pago,
  falta, próxima e última parcela, dica de quitar antecipado). Abertas pela linha "Parcelas" do
  Futuro. `GET /future/installments` (era stub) com `installmentPlanProgress` em
  `packages/shared` (com teste): "falta pagar" = parcelas que ainda vêm × valor da parcela, "já
  pago" = total − falta (o banco arredonda a 1ª parcela, e o outro jeito deixava centavos). Na
  conta do Bruno: 9 parcelamentos, R$ 652,02/mês, falta R$ 513,20. Gradientes `resumoParcelas` e
  `dicaIa` capturados do Figma pro `packages/ui`.
- **Telas de Assinaturas (§6.6, Figma 31:577, 31:676, 49:1179, 49:1212, 49:1245)** —
  `apps/mobile/app/futuro/assinaturas.tsx` (por mês/por ano, aviso das marcadas sem uso com a
  economia, selos "Sem uso"/"Subiu X%", ordenar) e `apps/mobile/app/futuro/assinatura/[id].tsx`
  (próxima cobrança, cartão, assinante desde, pago no ano, último reajuste, como cancelar, "Já
  cancelei"/"Ainda está ativa" e "Você usa esse serviço?"). `GET /future/subscriptions` e
  `PATCH /subscriptions/:id` (eram stubs); cancelar/desfazer reenfileira o pipeline pra recalcular
  comprometido e "a vencer". Coluna nova `recurrences.cancelled_at` (migração
  `0006_slippery_silver_centurion.sql`, já aplicada): cobrança depois do "Já cancelei" vira
  alerta `subscription_charged_after_cancel` (tipo novo, registrado no CONTEXTO §6.9).
  `latestPriceChange` em `packages/shared` (com teste). Testado com a conta real do Bruno:
  cancelar o Melimais tirou R$ 19,90 do comprometido de novembro, desfazer devolveu.
  Plano da semana ganhou o item "Marcar assinaturas sem uso" (`subscription_usage`: assinaturas
  ativas sem o uso marcado, leva pra Assinaturas, conclui sozinho quando todas forem marcadas).
  Entra a partir do próximo plano (segunda), porque o desta semana já foi gerado.
- **Tela de Fixos recorrentes e "Nova conta fixa" (§6.6, Figma 48:1034 e 48:1111)** —
  `apps/mobile/app/futuro/fixos.tsx` (resumo do próximo mês, lista com "pago com · todo dia DD",
  selo "estimado" e aviso de conta que varia) e `src/features/fixos/NovaContaFixaSheet.tsx`
  (nome, valor, dia, pago com). Junta os fixos detectados (`recurrences`) com os cadastrados à
  mão (`manual_recurring_bills`, tabela que já existia). Rotas `GET /future/bills` (era stub),
  `POST /future/bills` e `DELETE /future/bills/:id` (CONTEXTO §8 atualizado). Conta cadastrada à
  mão entra no comprometido e no "a vencer" pelas mesmas regras (`manualBillAsRecurrence` em
  `packages/shared`, com teste). Tocar numa conta cadastrada à mão oferece remover. Testado com a
  conta do Bruno: uma conta de teste de R$ 100,00 entrou no comprometido de novembro e no "a
  vencer" de outubro, e saiu ao remover.
- **Rótulos das barras do "Já comprometido" na Home** mostravam reais ÷ 10 ("234" pra R$ 2.340);
  agora reais inteiros, como no Figma (25:197). Também corrigidas chaves React repetidas no card
  de parcelas/assinaturas da Home ("3/3" aparecia duas vezes).
- **Futuro: cards de fatura com a fatura real** de cada cartão conectado
  (`credit_cards.current_bill_cents`) e vencimento pelo dia de vencimento do cartão
  (`nextDueDateKey`, com teste).
- **Conexões fictícias do seed removidas da conta do Bruno** (2026-10-10, ele mesmo rodou o
  script): Itaú e Nubank, com 4 contas, 2 faturas, 8 transações ocultas e 3 exemplos de Casa e
  Amigos ligados a elas (`household_expenses`, `split_expenses`). Ficou só a conexão MeuPluggy
  real, com 1.135 transações. Rodar `db:seed` de novo recria tudo isso.
- Validado com a conta real do Bruno em 2026-10-10: 9 parcelamentos ativos (os mesmos 9 contados
  direto nos dados do Pluggy); parcelas futuras de nov/26 a abr/27 somam R$ 513,20 — exatamente a
  diferença entre limite usado e fatura do Nubank. Os 5 parcelamentos fictícios do seed saíram.

- **Fatura do cartão (§6.6, Figma 48:1147)** — tela nova `apps/mobile/app/futuro/fatura/[id].tsx`,
  aberta pelo card de fatura do Futuro (que antes não abria nada): total, fecha/vence, e a quebra
  por parcelas, assinaturas, fixos, outras compras e "ainda não detalhado"; "Ver transações do
  cartão" abre Transações já filtrado pela conta (`?accountId=`). `GET /future/statements/:id`
  (era stub; `:id` = conta do cartão, `?month=YYYY-MM` opcional).
- **Correção da fatura depois do fechamento** (2026-10-12): a fatura de outubro do Bruno fechou
  em 11/10 e foi paga no mesmo dia, mas o Planor mostrava R$ 6.845,03 a pagar dia 18 e o plano da
  semana pedia "Separar R$ 6.466,23". Motivo: um dia depois do fechamento, o Pluggy ainda manda os
  lançamentos da fatura fechada sem `billId`, e o pagamento dela vem previsto pra fatura de
  novembro. Agora a sincronização lê `GET /bills` do Pluggy (faturas fechadas, com total e
  pagamentos) e grava em `card_statements` (migração `0007_clever_randall.sql`, já aplicada:
  `paid_cents` + índice único cartão/mês). `cardBillSummary` e `cardBillToPay` em
  `packages/shared` (com teste, inclusive os dois cenários reais de 10/10 e 12/10) separam a
  fatura fechada da aberta pelo mês da última fechada. Resultado em 12/10: fatura de novembro
  R$ 577,16 (R$ 198,36 de parcelas + R$ 378,80 ainda não detalhados), vence 18/11. Fecha dia 11 e
  vence dia 18 vêm das últimas 3 faturas (o Nubank manda `balanceCloseDate` nulo — antes o
  fechamento ficava no dia 1).
- **Plano da semana: "Separar R$ X para a fatura" conclui sozinho** quando o banco informa o
  pagamento (a fatura some da lista a pagar). O item desta semana do Bruno já aparece concluído.
- **Valores do Futuro obedecem ao olho** — os números da aba usavam `formatCents` cru.
- **Provedor de IA escolhido: Claude** (Bruno, 2026-10-12; resolve a §15.6 por ora — o teste com
  50 perguntas em Claude/GPT/Gemini fica pra antes do lançamento). Conta no console da Anthropic
  com crédito pré-pago e teto de gasto, chave `planor-dev` (90 dias) em `ANTHROPIC_API_KEY`. AI SDK
  7 (`ai` + `@ai-sdk/anthropic`) em `apps/api`.
- **Categorização por IA (§6.3, passo 2.3)** — `services/aiCategorization.ts`, chamado no
  `process-transactions` depois das regras. Haiku 5.5 (`claude-haiku-5-5`), saída em JSON com a
  categoria numa lista fechada (as do usuário + "Não sei"); pergunta por estabelecimento, em lotes
  de 60, até 300 por rodada. Resposta guardada em `ai_merchant_categories` (migração
  `0009_furry_nebula.sql`, já aplicada) — o mesmo estabelecimento nunca é perguntado de novo, e
  compras novas dele usam a resposta guardada. Só aplica com confiança ≥ 0,6
  (`AI_MIN_CONFIDENCE`); grava `category_source = 'ai'` e `confidence`. Regra do usuário ou
  global que case depois passa por cima da IA; escolha manual nunca muda. Sem chave ou com erro do
  provedor, não faz nada e tenta na próxima sincronização.
  Privacidade (§10): só vai o nome do estabelecimento sem números (CPF/CNPJ/conta/código), o
  valor típico e se foi crédito, débito ou Pix pra empresa — `isAiEligible`,
  `looksLikePersonName` e `merchantNameForAi` em `packages/shared` (com teste). Pix/TED pra pessoa
  e nome que parece de pessoa (quem vende na maquininha como pessoa física) não vão.
  Na conta do Bruno (12/10): 211 estabelecimentos, ~22 mil tokens (< US$ 0,06), 38 s. Aplicado com
  o OK dele: 456 compras categorizadas pela IA; sem categoria caiu de 688 (68%) pra 232 (23%) —
  184 em que a IA não teve certeza e 48 que não podem ir (Pix/nome de pessoa). TikTok (149
  compras) ficou em Lazer, confirmado pelo Bruno. No primeiro teste, antes do
  `looksLikePersonName`, ~13 nomes de pessoa que vendem na maquininha foram enviados uma vez; as
  respostas deles foram apagadas do cache e não são mais enviados.
- **Planor IA com streaming (SSE)** — `POST /ai/chat?stream=1` manda o texto aos pedaços
  (`delta`) e termina com `done` (mesmo corpo da resposta sem stream). No app, `src/lib/api/aiStream.ts`
  lê com o `fetch` do `expo/fetch` (o do React Native não lê o corpo aos poucos); o balão vai
  enchendo e o "digitando" aparece só enquanto a IA consulta os dados. Usa o `fullStream` do AI SDK
  (o `textStream` engole erro do provedor). O olho também esconde valor pela metade no fim do
  texto ("R$ 1.720,").
- **Cobrança duplicada de assinatura (§6.3, passo 5)** — alerta novo
  `subscription_duplicate_charge` (registrado no CONTEXTO §6.9): a mesma assinatura cobrou valor
  parecido (±5%) duas vezes em até 7 dias (`duplicateCharges` em packages/shared, com teste),
  olhando os últimos 35 dias. Nenhuma duplicada nos dados do Bruno.
- **"Filtrar compromissos" no Futuro (Figma 49:1095)** — o botão de filtro e os chips Tudo /
  Parcelas / Assinaturas / Fixos (que antes não filtravam nada) agora filtram de verdade: o card
  "Já comprometido", as barras e o bloco do mês. Sheet com "Mostrar" e "Até" 3, 6 ou 12 meses.
  `GET /future/timeline?kinds=&months=`; `committed_by_month` passou a guardar 12 meses (era 6).
- **Fatura do cartão: trocar de mês** — chips de mês no topo (até 6 fechadas, a aberta e as futuras
  com parcela); a resposta traz `availableMonths`.
- **Metas e limites de categoria (§6.8, §6.5)** — telas `app/ia/metas.tsx` (Figma 51:1177) e
  `app/ia/meta/[id].tsx` (51:1249), sheets "Nova meta"/editar (51:1322), "Registrar valor
  guardado" (51:1295) e "Criar limite" (46:934, com o componente novo `Slider` em `@planor/ui`).
  Metas abre por um botão novo no topo da Planor IA; "Criar limite"/"Ajustar" fica num card na
  tela da categoria em Gastos. API: `GET/POST /goals`, `GET/PATCH/DELETE /goals/:id`,
  `POST /goals/:id/contributions` (eram stub); `goals.starts_month` (migração
  `0011_ambitious_hardball.sql`, já aplicada) pro "começar no mês que vem". Regras puras em
  `packages/shared/src/calculations/goals.ts` (com teste): ritmo por mês/semana até o prazo, mês
  em que completa no ritmo atual, situação do limite, textos dos cards — os números do Figma
  batem (R$ 4.000 em 12 meses = R$ 333,33; R$ 2.550 em 2 meses = R$ 1.275,00). Alertas novos
  `limit_80` e `limit_exceeded` (uma vez por mês cada), testados com um limite de teste no Lazer
  da conta do Bruno e apagados depois.
- **Planor IA propõe limite e meta (Figma 33:711)** — ferramentas `get_goals`,
  `propose_category_limit` e `propose_goal`. A IA nunca cria nada: mostra o cartão com "Criar
  limite/meta" e "Ajustar valor", e quem confirma é o usuário. O valor do limite sai do backend
  (80% da média mensal, arredondado de R$ 10 em R$ 10, entre R$ 100 e R$ 500); o da meta é o que a
  pessoa disse (sem valor, a IA pergunta), e o "por mês" do cartão é calculado no app. Testado na
  conta do Bruno: "gastar menos com mercado" → limite de R$ 130,00 (média R$ 166,88); "juntar 5 mil
  em 10 meses" → cartão da meta; "começar uma reserva" → perguntou o valor.
- **Planor IA — chat de verdade (§6.7, Figma 33:556, 33:643, 50:1127)** — a aba IA deixou de ser
  mock: sugestões e campo mandam a pergunta, conversa com balões, "digitando", cartão de dados com
  o gráfico da categoria (33:674) e histórico de conversas (`app/ia/historico.tsx`, com a cota do
  mês no Grátis). API: `POST /ai/chat`, `GET /ai/conversations`, `GET /ai/conversations/:id`,
  `GET /ai/usage`; `ai_messages.created_at` novo (migração `0010_soft_slipstream.sql`, já
  aplicada). Sonnet 5.5 (`claude-sonnet-5-5`) com 8 ferramentas em `apps/api/src/ai/tools.ts`
  (gasto por categoria, detalhe da categoria, busca de transações, assinaturas, parcelas,
  comprometido, sobra, plano da semana). **A IA nunca faz conta:** cada ferramenta chama a mesma
  rota que a tela usa (`app.inject`, com o token de quem pergunta) e devolve valores já
  formatados, totais e percentuais prontos; o prompt (`src/ai/prompt.ts`) proíbe calcular e manda
  dizer que não sabe. Testado com a conta do Bruno: delivery de setembro (R$ 128,35, igual à
  tela), recusou calcular média por dia, recusou indicar CDB/Tesouro, TikTok de setembro
  (R$ 2.321,67 em 43 compras), sobra de outubro, e não revelou quem recebeu Pix. Nomes que vão pro
  modelo passam por `transactionNameForAi` (packages/shared, com teste): Pix/compra com pessoa
  vira rótulo genérico. Cota: 10 perguntas/mês no Grátis (`ai_usage`), 402 `quota_exceeded`
  quando acaba; Pro ilimitado. As conversas de teste foram apagadas da conta do Bruno.
- **Central de alertas (§6.9, Figma 34:857)** — tela `app/alertas.tsx`, aberta pelo sino da Home
  (que antes não fazia nada): grupos por dia (Hoje, Ontem, data), chips Todos / Não lidos /
  Importantes, "Marcar todos como lidos" no topo; tocar marca como lido e abre o destino. Valores
  no texto obedecem ao olho. `GET /alerts` e `POST /alerts/read` (eram stub; sem `ids` marca
  todos). O texto de cada alerta sai de `describeAlert` em `packages/shared` (com teste). O
  contador do sino só conta os tipos que a central mostra (`KNOWN_ALERT_TYPES`).
- **Gasto fora do padrão (§6.3, passo 7) e outros alertas** — `services/detectAlerts.ts`, no fim
  do `process-transactions` e no job novo `detect-alerts` (diário, 8h, §9). Gera:
  `unusual_spend` de compra (> 1,5× a média por compra da categoria nos 3 meses anteriores) e de
  categoria (variável acima de 80% do habitual antes do dia 20), `subscription_price_up` e
  `statement_closing` (fatura fecha em até 3 dias, com a previsão e as parcelas). Regras puras
  `unusualPurchases`/`categoriesAheadOfPace` (com teste). Simulado em datas passadas da conta do
  Bruno: em 15/09 sairiam 3 compras fora do padrão (TikTok, Apple) e 3 categorias acima do ritmo.
- **"Ontem" nunca aparecia** nos grupos por dia (Gastos · Transações): `dayGroupLabel` comparava a
  data com o dia anterior a ela mesma. Corrigido.
- **Editar parcelamento (§6.6, Figma 49:1137)** — lápis no detalhe do parcelamento abre o sheet
  `src/features/parcelas/EditarParcelamentoSheet.tsx`: nome, categoria e "Já quitei antecipado".
  `PATCH /future/installments/:id`; colunas novas `installment_plans.display_name` e
  `category_id` (migração `0008_regular_pet_avengers.sql`, já aplicada). O nome fica separado do
  detectado (`merchant_name` é a chave que casa o parcelamento entre sincronizações). A categoria
  vai pra todas as parcelas, inclusive as que chegarem depois (o pipeline agora roda os
  parcelamentos antes dos resumos do mês). Quitado sai do comprometido, do "a vencer", da Home e
  dos totais de Parcelas, e fica no fim da lista como "quitado" (dá pra desfazer). Validado na
  conta do Bruno e desfeito: quitar o PagTesouro tirou R$ 29,12 de cada mês até abril.

**Falta:**
- Alertas: push (§9, `push-dispatcher`; precisa da conta paga de desenvolvedor da Apple) e
  preferências por tipo/horário silencioso; tipos do §6.9 ainda não gerados (`charge_upcoming`,
  `subscription_new`, `installment_new`, `limit_80`/`limit_exceeded`, `weekly_plan_ready`,
  `monthly_recap_ready`, `household_*`, `social_*`, `trial_ending`). O ícone `cadeado` do
  registry tem o desenho de uma estrela — conferir no Figma. Os 3 alertas fictícios do seed
  foram apagados da conta do Bruno (2026-10-12, com o OK dele). Plano da semana: faltam os itens que dependem de metas e dos objetivos do onboarding.
- Parcelas: "Avisar antes da última parcela"
  (do sheet de editar) espera o push (§6.9).
- Fixos: editar uma conta cadastrada à mão (hoje só remove). "Filtrar compromissos": a parte
  "Cartões e contas" (assinaturas e fixos ainda não guardam em qual cartão/conta caem).
- Assinaturas: "Me lembrar 3 dias antes da cobrança" (Figma 49:1269) e o lembrete de 30 dias do
  "Uso pouco" esperam o push (§6.9) — sem ele, "Lembrete criado" seria mentira. O alerta de
  cobrança depois do cancelamento só aparece no contador do sino (a central de alertas ainda não
  existe).
- Passo 6 (fixo/variável pela recorrência).
- Planor IA: voz (microfone, "Ouvindo" 50:1334),
  `simulate_purchase` (v2), o sheet "Limite de perguntas" com o Pro (51:1359, depende do
  RevenueCat), "Meta criada" (33:755), classificador de intenção e cache de prompt.
- Metas: seção "Em grupo" e metas da casa (Fase 5), estado vazio do Figma (82:2118 — hoje usa o
  `EmptyState` padrão), "Limite criado" (46:972), escolher ícone da meta, item de meta no plano da
  semana. As 4 metas fictícias do seed (com 6 depósitos e os participantes da meta em grupo) foram
  apagadas da conta do Bruno em 2026-10-12, com o OK dele.
- "Atualizar agora" leva ~1 min na conta do Bruno (1.135 transações): a sincronização grava uma
  transação por vez. Dá pra fazer em lote.

---

## Decisões diferentes do `CONTEXTO.md` original (e por quê)

- **Só parcelamentos ativos ficam em `installment_plans`** (a última parcela é do mês atual ou
  depois). Os que já terminaram não aparecem em lugar nenhum hoje, e guardar todos inflaria os
  totais da Home, que soma a tabela inteira.
- **Regra de recorrência mais solta que a do §6.3 em um ponto e mais rígida em outros** (pedido
  dos dados reais): alta de até 50% entre duas cobranças continua a série (é reajuste — o Spotify
  subiu 28%); comerciante com mais de 3 cobranças por mês não é assinatura (TikTok, padaria);
  IOF de compra internacional fica de fora; série sem cobrança há mais de 45 dias é considerada
  encerrada e sai da lista (a resposta "Uso pouco/Não uso" dela se perde se ela voltar depois).
- **"Ainda não detalhadas" conta tudo como gasto do mês corrente** — a fatura aberta junta
  compras do fim do mês anterior e deste mês, e sem a transação não dá pra saber a data. Quando o
  banco manda as compras, elas saem dessa linha e entram nas categorias com a data certa. O
  gráfico diário (sparkline) e a divisão fixo/variável da Home não incluem essa parte.
- **Plano da semana sem o selo "Até R$ X/mês" e sem "a partir dos objetivos que você escolheu"**
  (Figma 47:1163) — nenhum dos tipos de item de hoje tem economia mensal pra mostrar, e os
  objetivos do onboarding ainda não são coletados. "Segurar [categoria]" vai até domingo (fim da
  semana do plano), não "até sexta" como no exemplo do Figma, e é o usuário que marca: só dá pra
  saber se ficou dentro do limite quando a semana acaba, e aí já é outro plano.
- **Assinaturas: "Assinante desde" e "Pago em [ano]" contam só a série detectada** — se o preço
  subiu mais de 50% de uma vez ou houve um intervalo maior que 35 dias, a série recomeça ali
  (Spotify do Bruno: "desde março de 2026", R$ 286,30 pagos em 2026, sem as duas cobranças de
  R$ 31,90 de jan/fev). O passo a passo "Como cancelar" é genérico (o Figma também é); não há
  instrução por serviço. Data prevista que passou sem cobrança aparece como "não cobrou em
  27/09" / "Atrasada", não "renova".
- **Fixos: um ícone só (repetir) pra todas as contas** — o Figma usa um ícone por tipo
  (casa, cartão, calendário…), mas o app não sabe o tipo de uma conta detectada ou digitada.
  "Pago com" de uma conta detectada é o banco da última cobrança. Conta cadastrada à mão com dia
  que já passou no mês conta como paga (o app não tem como saber).
- **Comprometido não inclui o mês corrente** — começa no mês seguinte (o mês corrente é "a vencer",
  outro número do §2). Recorrência mensal (até 35 dias) cobra uma vez por mês a partir do mês da
  próxima cobrança — somar o intervalo em dias faria um mês "pular" de vez em quando;
  recorrência com intervalo maior que 35 dias e sem data não entra (não dá pra saber o mês).
- **`card_statements` só guarda faturas fechadas** (vêm do `/bills` do Pluggy, que não lista a
  aberta). A aberta continua calculada em `credit_cards.current_bill_cents`. O card do Futuro, o
  plano da semana e a tela da fatura mostram "a fatura a pagar": a fechada enquanto falta pagar
  (mesmo atrasada), depois a aberta.
- **Planor IA diferente do §6.7:** um modelo só (Sonnet), sem o classificador de intenção barato (com 8 ferramentas o próprio
  modelo escolhe bem, e um classificador seria outra chamada por pergunta); sem cache de prompt (o
  prompt de sistema tem menos que o mínimo de tokens que a Anthropic cacheia). Sugestão "Posso
  parcelar um celular?" saiu do início (simular compra é v2) e entraram "Quanto vai sobrar este
  mês?" e "Quanto já está comprometido nos próximos meses?". O microfone não aparece até a voz
  existir.
- **Limiares do gasto fora do padrão que o CONTEXTO não define** (§6.3, passo 7): compra só
  vira alerta com pelo menos R$ 30 (R$ 12 numa categoria de média R$ 7 passa de 1,5×, mas é
  ruído); média por compra só vale com 3+ compras na categoria; no máximo um alerta de compra
  por categoria por rodada (o TikTok dava três no mesmo dia); só compras dos últimos 3 dias (a
  primeira rodada não despeja o histórico); parcelas ficam de fora (compromisso já conhecido). O
  ritmo da categoria só vale pra categorias variáveis com média de pelo menos R$ 100 (uma parcela
  de R$ 46 sozinha já passava dos 80%). Os dois tipos usam `unusual_spend`, com `payload.kind`
  `purchase` ou `category`.
- **Metas liberadas no plano Grátis** — a tabela de planos do CONTEXTO põe "metas e plano personalizados" no Pro, mas
  sem o RevenueCat não há como assinar; o bloqueio entra junto com a assinatura.
- **Metas abre pela Planor IA** — o §5 põe `ia/metas` dentro da IA, mas nenhuma tela do Figma
  tem o caminho até lá (a aba Metas é v2). Ficou um botão com o ícone de meta no topo da IA, ao
  lado do histórico. O card de limite na categoria usa um texto fixo, não a "dica da IA".
- **"Importantes" na central** = gasto fora do padrão, assinatura mais cara, cobrança depois do
  cancelamento e problemas de conexão (o CONTEXTO lista o chip, mas não diz quais tipos).
- **"Editar parcelamento" sem "Avisar antes da última parcela"** — sem push (§6.9) o aviso não
  chegaria; mesma decisão do "Me lembrar 3 dias antes" das assinaturas.
- **Fatura do cartão tem seções além do Figma** — "Outras compras" (compras avulsas) e "Ainda não
  detalhado" (o que o banco cobrou e não mandou uma a uma). O Figma (48:1147) é de uma fatura
  futura, só com parcelas, assinaturas e fixos; numa fatura real, sem essas duas linhas a soma
  das seções não bateria com o total. Na fatura fechada o rótulo é "Fatura paga"/"Fatura
  fechada" em vez de "Já comprometido", e a data diz "Fechou".

- **Detalhe da categoria diz "compras", não "pedidos"** (Figma 28:396 usa "14 pedidos" porque o
  exemplo é Delivery) — a tela serve pra qualquer categoria, e "pedidos de Moradia" não faz
  sentido.

- **"Autorizado em" é o `createdAt` do item no Pluggy** (coluna `connections.authorized_at`,
  migração `0002_special_vin_gonzales.sql`, já aplicada), gravado a cada sincronização. Fica
  vazio (linha some) até a conexão sincronizar de novo. Ao renovar o consentimento o item é o
  mesmo, então a data continua a da primeira autorização.
- **"Fatura atual" do cartão = limite usado − parcelas já lançadas pra faturas futuras**
  (`currentBillCents` em `packages/shared/src/calculations/creditCardBill.ts`, com teste),
  calculada na sincronização e gravada em `credit_cards.current_bill_cents` (migração
  `0003_great_crystal.sql`, já aplicada). O `balance` que o Pluggy devolve pro cartão é o limite
  usado, não a fatura — confirmado pelo Bruno em 2026-10-10: R$ 6.979,43 usado, fatura no app do
  Nubank R$ 6.466,23, e a conta bateu no centavo (R$ 513,20 de parcelas nov/26–abr/27). Somar só
  as transações da fatura aberta daria errado: o Pluggy ainda não tinha entregado R$ 1.410,07 de
  compras recentes que já estavam no limite. Desde 2026-10-12 a conta também desconta o que falta
  pagar da última fatura fechada (`cardBillSummary`), então entre o fechamento e o pagamento a
  aberta não soma mais a fechada.
- **Sem "Lembrar amanhã" em "Acesso vencendo"** (Figma 83:2288) — precisaria guardar um adiamento
  em algum lugar, e o aviso de 1 dia já sai sozinho pelo job.
- **Sheet "Não conseguimos atualizar" diz "a cada 6 horas", não "a cada hora"** como no Figma
  (83:2270) — é o intervalo real do job `sync-all-connections` (§6.2 pede 4 a 6 horas).
- **No plano Meu Pluggy, a conexão aparece com o nome "MeuPluggy", não com o do banco** — é o
  conector que o Pluggy devolve no item. Some quando migrarmos pra um plano com conectores
  diretos (§15.1).
- **Selo "Vence em N dias" sem o ícone de alerta** (Figma 83:2288) — o `Badge` do packages/ui
  ainda não aceita ícone; diferença pequena, fica pra quando o Badge ganhar essa variante.

- **No plano "Meu Pluggy", a atualização automática a cada 4-6h não consegue forçar o banco** —
  o Pluggy responde 400 "MeuPluggy item cant be updated" ao `PATCH /items/{id}` (confirmado em
  2026-10-08 com a conexão real do Bruno). Nesse plano quem busca dado novo no banco é o próprio
  app meu.pluggy.ai, no ritmo dele; a rodada de 6h só relê o que ele já trouxe. Ou seja: o dado
  pode ficar mais velho que 6h, e "Atualizar agora" também só relê. O código já pede a
  atualização de verdade e funciona sem mudança quando migrarmos pra um plano pago — mais um
  ponto pra conversa do CONTEXTO.md §15.1.

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
