# Progresso do Planor

> Isto **não é** o `CONTEXTO.md`. O `CONTEXTO.md` diz o que o produto **deve ser**. Este arquivo
> diz **o que já existe de verdade no código agora**, o que falta de cada fase, e — importante —
> onde o código tomou um caminho diferente do que o `CONTEXTO.md` descreve, e por quê. Serve pra
> qualquer pessoa (ou IA) entender o estado real do projeto sem ter que ler o histórico do git
> inteiro ou reconversar tudo de novo.
>
> **Regra (ver `CLAUDE.md`, Regra Nº 2): atualize este arquivo no mesmo commit que fecha ou avança
> uma fase**, antes de abrir o PR — não depois.

Última atualização: 2026-10-07.

---

## Visão geral

| Fase | Status |
|---|---|
| 0 — Base | 🟡 quase completa (falta Sentry/PostHog) |
| 1 — Interface com dados fictícios | ✅ completa |
| 2 — Conta e dados reais | 🟡 em andamento |
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

**Falta:**
- Login com Apple — precisa do Apple Developer Program (US$99/ano), que ainda não existe.
- Segurança: biometria, bloqueio automático ao sair do app, trocar e-mail e aparelhos conectados
  — só "Ocultar valores ao abrir" é real por enquanto (ver acima).
- Pluggy (Open Finance) — nada implementado ainda. `apps/api/src/routes/connections.ts` é só
  stub pro ciclo de vida de conexão (token, sync, desconectar, webhook) — só `/imports` saiu dali.
  Precisa de túnel público (ngrok ou deploy) pra testar o webhook, já que o agregador precisa
  alcançar a API de fora da rede local.
- Importar fatura em **PDF** — precisa de extração de texto + LLM pra estruturar em JSON
  validado com zod (CONTEXTO.md §6.2), e o provedor de IA final ainda é decisão em aberto
  (CONTEXTO.md §15.6). `POST /imports` já devolve `501` com uma mensagem clara pra esse caso.
- Pipeline de normalização e categorização **automática** por regras (dicionário global de
  comerciantes/palavras-chave, CONTEXTO.md §6.3 passo 2.2) — ainda não existe. A categorização
  manual (via "Mudar categoria") já é real, e agora tem duas entradas de transação nova pra uma
  automação processar (Importar fatura OFX e, no futuro, Pluggy) — só falta escrever a automação
  em si e rodá-la nesse ponto.
- Recalcular `monthly_summaries` depois de importar — não existe (é o passo 9 do pipeline, que
  também não existe em lugar nenhum ainda, nem rodou uma vez fora do seed). Na prática: uma fatura
  importada aparece certinho em Transações, mas **não muda** a sobra da Home nem o resumo de
  Gastos, que continuam lendo o agregado pré-calculado do seed.
- Detalhe da categoria (`GET /spending/category/:id`, gráfico dos últimos 6 meses) — adiado de
  propósito: só existe um mês semeado (`2026-10`), então o gráfico de 6 meses não tem dado real
  pra mostrar ainda (mesmo motivo já registrado abaixo pra "tendência vs. mês anterior").
- IA (`apps/mobile/app/(tabs)/ia.tsx`) continua 100% mockada — não é uma lacuna de "dados reais"
  como as outras, é que a função em si (chat com function calling) é escopo da Fase 3.
- Perfil: o bloco de usuário/plano, o formulário de edição e o toggle de Segurança são reais. Os
  grupos "Conta" (contas conectadas), o resto de "Preferências" (notificações, privacidade) e
  "Juntos" (casa/amigos/indicação) continuam com texto de exemplo de `lib/mocks/perfil.ts` —
  dependem de Pluggy/Fase 5.

---

## Decisões diferentes do `CONTEXTO.md` original (e por quê)

- **Tendência "vs. mês anterior"** (Home e Gastos) retorna `null` da API em vez de um número — só
  existe um mês (`2026-10`) semeado em `monthly_summaries`, não tem como comparar sem inventar.
  As duas telas escondem o badge de tendência quando vem `null`, em vez de mostrar um número fabricado.
- **`GET /spending/summary` lê de `monthly_summaries`, não soma `transactions` ao vivo** — a
  amostra de transações do seed é parcial de propósito (o próprio `seed.ts` admite isso no
  comentário do topo: "não os 14 pedidos citados no §12"), então somar ao vivo dava um total menor
  que o oficial. `monthly_summaries` é o agregado completo e é o que o `/home` já usava.
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

---

## Ambiente local — cada pessoa configura o próprio

Ver `CONTRIBUTING.md` (seção "Ambiente de desenvolvimento") pro passo a passo completo. Resumo:
o banco de dados e o Pluggy são **compartilhados** (mesmo projeto Supabase/sandbox pros dois), mas
a API e o Expo rodam **localmente na máquina de cada um** — isso significa que `EXPO_PUBLIC_API_URL`
no `.env` de cada pessoa aponta pro IP da própria rede Wi-Fi, nunca pro IP de outra pessoa.
