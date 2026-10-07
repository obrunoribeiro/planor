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

**Falta:**
- Login com Apple — precisa do Apple Developer Program (US$99/ano), que ainda não existe.
- Login com Google — precisa de um OAuth Client novo no Google Cloud **específico deste projeto
  Supabase** (cada projeto tem sua própria URL de callback; um client de outro app/projeto não
  serve, mesmo que seja do mesmo dono).
- Pluggy (Open Finance) — nada implementado ainda. `apps/api/src/routes/connections.ts` é só
  stub. Precisa de túnel público (ngrok ou deploy) pra testar o webhook, já que o agregador
  precisa alcançar a API de fora da rede local.
- Pipeline de normalização e categorização automática por regras — não existe. Hoje a
  categorização que aparece é só a do seed; não há nada processando transação nova.
- Importar fatura (PDF/OFX) — não começou.
- IA (`apps/mobile/app/(tabs)/ia.tsx`) continua 100% mockada — não é uma lacuna de "dados reais"
  como as outras, é que a função em si (chat com function calling) é escopo da Fase 3.
- Perfil: só o bloco de usuário/plano e o formulário de edição são reais. Os grupos "Conta"
  (contas conectadas), "Preferências" (segurança), "Juntos" (casa/amigos/indicação) continuam
  com texto de exemplo de `lib/mocks/perfil.ts` — dependem de Pluggy/Fase 5.
- "Ocultar valores ao abrir" (configuração em Segurança, CONTEXTO.md §6.10) não existe — o olho
  da Home (`useHiddenValuesStore`) é só estado em memória da sessão atual, não persiste.

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

---

## Ambiente local — cada pessoa configura o próprio

Ver `CONTRIBUTING.md` (seção "Ambiente de desenvolvimento") pro passo a passo completo. Resumo:
o banco de dados e o Pluggy são **compartilhados** (mesmo projeto Supabase/sandbox pros dois), mas
a API e o Expo rodam **localmente na máquina de cada um** — isso significa que `EXPO_PUBLIC_API_URL`
no `.env` de cada pessoa aponta pro IP da própria rede Wi-Fi, nunca pro IP de outra pessoa.
