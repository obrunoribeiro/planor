# Planor — Contexto do produto para desenvolvimento

> Este arquivo descreve **o que é o Planor, como ele funciona e como vamos construí-lo**. Ele serve de contexto para quem escreve o código, seja uma pessoa ou um assistente de IA no VS Code. Ele resume o que já foi decidido no plano de negócio e no design do Figma.
>
> **Como usar:** salve na raiz do repositório. Se usar Claude Code, renomeie para `CLAUDE.md`. Se usar Copilot, Cursor ou outro agente, para `AGENTS.md`. Assim o assistente lê o arquivo automaticamente antes de cada tarefa. Sempre que uma decisão mudar, atualize este arquivo.
>
> **Design (fonte da verdade visual):** https://www.figma.com/design/xAWFDxaXDQsvyz6wiCAJnH/Planor
> Páginas: `Style Guide` (cores, tipografia, marca), `IA` (arquitetura da informação), `App` (todas as telas, organizadas em linhas por fluxo) e `Componentes`.

---

## 1. O produto em uma página

**Planor** é um app mobile (iOS e Android) de finanças pessoais. Ele se conecta aos bancos do usuário pelo **Open Finance**, organiza os gastos sozinho e mostra **quanto do dinheiro futuro já está comprometido**. A Planor IA conversa com o usuário e transforma isso em ações concretas.

**Promessa:** "Saiba hoje quanto sobra no fim do mês."

**Diferenciais em relação a apps como Pierre, Mobills e o app do próprio banco:**
1. **Olhar para frente.** O Planor mostra a sobra prevista até o fim do mês e quanto já está comprometido nos próximos meses com parcelas, assinaturas e contas fixas.
2. **Ação, não relatório.** Toda semana há um plano com 1 a 3 ações concretas, além de alertas antes de o problema acontecer.
3. **Caça-assinaturas.** Encontra cobranças recorrentes, reajustes e duplicidades.
4. **Junto com outras pessoas.** Casa compartilhada (casal ou família), metas em grupo, desafios e feed entre amigos.

**Público inicial:** adulto de 22 a 40 anos, com cartão de crédito, parcelas espalhadas e mais de um banco, que não sabe quanto do salário já está comprometido.

### Princípios que valem para todo o código
- **Só leitura.** O Planor **nunca move dinheiro**: não paga, não transfere e não junta dinheiro de grupo. Metas, acertos e mesadas são **registrados** pelo usuário, e a transferência acontece no app do banco dele.
- **A IA nunca faz conta.** Todo número exibido ou dito pela IA vem do backend, por consultas determinísticas. O modelo só escreve texto em cima de resultados prontos.
- **Privacidade por padrão.**
  - Amigos nunca veem saldo, renda nem gastos.
  - No feed e nos stories, os valores ficam ocultos por padrão e só porcentagens aparecem.
  - Na casa compartilhada, só as categorias escolhidas entram.
- **O usuário corrige e o sistema aprende.** Mudar a categoria de uma transação pode virar regra para as compras parecidas.
- **Honestidade nas telas.** Quando o app não sabe algo (por exemplo, se uma assinatura é usada), ele pergunta ao usuário. Não inventa.
- **Dark mode primeiro**, com destaques em roxo e gradientes.

---

## 2. Glossário (use estes nomes no código e na interface)

| Termo (UI) | Nome no código | Definição |
|---|---|---|
| Sobra prevista | `projectedLeftover` | Renda do mês − já gasto no mês − a vencer até o fim do mês |
| Já comprometido | `committed` | Soma de parcelas, assinaturas e fixos que já vão cair nos próximos meses |
| A vencer | `dueUntilMonthEnd` | O que ainda será cobrado até o último dia do mês corrente |
| Fixo / Variável | `expenseKind: 'fixed' \| 'variable'` | Fixo se repete todo mês com valor parecido; variável muda |
| Parcelamento | `installmentPlan` | Compra parcelada ("PARC 3/10") com parcelas futuras projetadas |
| Assinatura | `subscription` | Cobrança recorrente de um mesmo serviço |
| Fixo recorrente | `recurringBill` | Conta fixa que não é assinatura (condomínio, internet, energia) |
| Fatura | `cardStatement` | Fatura do cartão, com data de fechamento e de vencimento |
| Plano da semana | `weeklyPlan` | De 1 a 3 ações sugeridas por semana |
| Meta | `goal` | Objetivo de guardar dinheiro (pessoal ou em grupo) |
| Limite | `categoryLimit` | Teto mensal de gasto para uma categoria |
| Casa | `household` | Grupo de casal ou família que compartilha categorias e divide despesas |
| Acerto | `settlement` | Registro de que uma pessoa pagou o que devia a outra |
| Desafio | `challenge` | Competição entre amigos, verificada pelas transações |
| Retrospectiva | `monthlyRecap` | Resumo do mês em formato de story, compartilhável |
| Consentimento | `consent` | Autorização do Open Finance para um banco, válida por até 12 meses |

---

## 3. Stack técnica

Pensada para uma equipe pequena, custo inicial baixo e um código só para iOS e Android.

| Camada | Escolha | Observações |
|---|---|---|
| Linguagem | **TypeScript** em tudo (`strict: true`) | Tipos compartilhados entre app e API |
| App mobile | **React Native + Expo** (SDK atual) com **Expo Router** | Um código para iOS e Android; builds com EAS |
| Estado e dados no app | **TanStack Query** (cache e persistência offline) + **Zustand** (estado de interface) | Persistir o cache para o modo sem internet |
| UI | Componentes próprios a partir dos tokens do Figma; **react-native-svg** para gráficos e anéis; **Reanimated** para animações | Não usar biblioteca de UI pronta que brigue com o design |
| Formulários | **react-hook-form** + **zod** | |
| Backend / API | **Node.js + Fastify** (TypeScript) | Pode rodar em Railway, Render ou Fly.io |
| Banco de dados | **PostgreSQL no Supabase** | |
| ORM / migrações | **Drizzle ORM** | Esquema em `packages/db` |
| Autenticação | **Supabase Auth** com código por e-mail (OTP) e login com Apple e Google | Biometria local com `expo-local-authentication` |
| Filas e jobs | **pg-boss** (fila em cima do Postgres) | Evita pagar Redis no começo. Alternativa: Inngest |
| Open Finance | Agregador **Pluggy** (alternativas: Belvo, Tecnospeed) | Ver seção 6.2. Começar no sandbox |
| IA | **API da Anthropic** (Claude) via **Vercel AI SDK** | Haiku para classificação e volume; Sonnet para a conversa. A abstração permite trocar de provedor |
| Voz | Transcrição de áudio para texto (ex.: API de transcrição do provedor escolhido) | A conversa por voz da IA |
| Push | **Expo Notifications** (APNs e FCM) | |
| Assinaturas | **RevenueCat** (`react-native-purchases`) | Compras pela App Store e Google Play, com webhooks para a API |
| Compartilhar | `react-native-view-shot` (gerar a imagem) + `react-native-share` (stories do Instagram) | Stories do Instagram exigem um App ID da Meta |
| Armazenamento seguro | `expo-secure-store` | Tokens; nunca guardar dados financeiros em AsyncStorage sem criptografia |
| Arquivos | Supabase Storage | PDFs e OFX importados |
| Observabilidade | **Sentry** (erros) + **PostHog** (eventos e funis) | |
| Landing page | Framer | Fora deste repositório |

### Estrutura do monorepo (pnpm + Turborepo)
```
planor/
├─ apps/
│  ├─ mobile/            # Expo + Expo Router
│  │  ├─ app/            # rotas (ver seção 5)
│  │  ├─ src/components/ # design system + componentes de tela
│  │  ├─ src/features/   # uma pasta por feature (home, gastos, futuro, ia, metas, casa, social...)
│  │  ├─ src/lib/        # api client, formatação, auth, analytics
│  │  └─ src/theme/      # tokens (cores, tipografia, espaçamento)
│  └─ api/               # Fastify
│     ├─ src/routes/
│     ├─ src/services/   # openfinance, categorization, recurrence, forecast, ai, notifications, billing
│     ├─ src/jobs/       # workers pg-boss
│     └─ src/ai/         # prompts, tools, guardrails
├─ packages/
│  ├─ db/                # esquema Drizzle + migrações + seed
│  ├─ shared/            # tipos, schemas zod, enums, regras de cálculo puras (ex.: projectedLeftover)
│  └─ config/            # eslint, tsconfig, prettier
└─ CLAUDE.md             # este arquivo
```

### Convenções obrigatórias
- **Dinheiro em centavos, como inteiro** (`amountCents: number`). Nunca usar float para valores.
  - Formatar com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
  - Gastos são negativos no banco de dados. Na interface, mostrar `- R$ 62,90` e `+ R$ 6.500,00`.
- **Datas** em UTC no banco de dados. Cálculos de "mês", "hoje" e vencimento usam o fuso **`America/Sao_Paulo`**.
- **Textos da interface em português do Brasil**, centralizados em `src/i18n/pt-BR.ts` (mesmo sem outro idioma, facilita revisar o texto).
- **Regras de cálculo puras** ficam em `packages/shared` e têm teste unitário (sobra, divisão da casa, ritmo de meta, acertos).
- **Toda tela tem quatro estados:** carregando (skeleton), vazio, erro e com dados.
- Acessibilidade:
  - `accessibilityLabel` em botões que só têm ícone;
  - área de toque mínima de 44×44;
  - respeitar o tamanho de fonte do sistema até um limite.

---

## 4. Design system

**Fonte da verdade: o Figma.** Arquivo `xAWFDxaXDQsvyz6wiCAJnH` (https://www.figma.com/design/xAWFDxaXDQsvyz6wiCAJnH/Planor). Com o MCP do Figma conectado, leia as variáveis e os componentes direto de lá (`get_variable_defs`, `get_design_context` com o node id) em vez de confiar nos valores de referência abaixo.

### Como gerar o tema
Gere tudo em `packages/ui/src/theme/` (ou `src/theme/`), a partir das variáveis do Figma:
- `colors.ts`: coleção `Color` (semântica, modos `Dark` e `Light`), que aponta para a coleção `Primitives`. No código, use **só os nomes semânticos** (`bg/surface` → `colors.bg.surface`). Nunca use um hex direto num componente.
- `tokens.ts`: coleção `Tokens` (números, modo único `Valor`):
  - `space/*`: 0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 60.
  - `radius/*`: xs 6, sm 8, md 12, lg 14, xl 16, 2xl 20, 3xl 24, 4xl 28, sheet 32, screen 40, full 999.
  - `size/*`: ícones, avatares 28/36/40/48/72 e caixas de ícone 36/40/44.
  - `stroke/*`: default 1, strong 1.5, control 2.
- `gradients.ts`: estilos de pintura `Gradiente/*`. Renderize com `expo-linear-gradient`.
  - Lista: Botão, Marca profundo, Ícone, Progresso, Card destaque, Sucesso, Âmbar, Teal, Rosa, Azul, Progresso âmbar, Progresso teal.
  - Também há `Brilho/Roxo`, um radial usado no topo das telas.
- `shadows.ts`: estilos de efeito.
  - `Sombra/Marca`, `Sombra/Marca forte`, `Sombra/Sucesso`, `Sombra/Âmbar`.
  - `Brilho/Borda interna`.
  - `Desfoque/Vidro`, que usa `expo-blur`.
- `typography.ts`: estilos de texto (tabela abaixo). Carregue Manrope com `@expo-google-fonts/manrope`.

### Cores de referência (modo Dark)
| Token | Valor | Uso |
|---|---|---|
| `bg/default` | `#0B0A12` | Fundo das telas |
| `bg/surface` | `#16151A` | Cards |
| `bg/elevated` | ~`#232329` | Sheets e diálogos |
| `bg/control` · `bg/sunken` · `bg/glass` | — | Controles, áreas rebaixadas, vidro |
| `overlay/scrim` | `#05040A` a 72% | Fundo atrás de sheets/diálogos |
| `border/default` · `border/strong` · `border/brand` | `#232329` · `#3A3A40` · roxo | |
| `text/primary` · `secondary` · `tertiary` | `#FFFFFF` · `#BDBDC5` · `#9797A0` | |
| `bg/brand` (roxo 500) | **`#7C5CFF`** | Cor principal |
| success / error / alert | `#22C997` · `#F0445A` · `#F5A524` | Bases; há `text/*`, `icon/*` e `bg/*-subtle` de cada |
| Acentos | pink, green, amber, blue, teal (300 e 700) | Avatares, categorias, templates |

O **modo Light** já existe nas variáveis; o lançamento é só em dark, mas monte o tema já preparado para os dois.

### Tipografia: **Manrope**
| Estilo | Tamanho/altura | Peso |
|---|---|---|
| Display | 32/40 | ExtraBold |
| H1 | 28/36 | ExtraBold |
| H2 | 22/28 | Bold |
| H3 | 18/24 | SemiBold |
| Body Large / Medium / Small | 16/24 · 14/20 · 13/18 | Regular/Medium |
| Label Large / Medium / Small | 16 · 14 · 12 | SemiBold/Bold |
| Caption | 12/16 | Medium |
| Number XL / Large / Medium / Small | 36/44 · 24/32 · 16 · 14 | ExtraBold/Bold (algarismos tabulares) |

### Medidas
- Tela base 390 de largura; margens laterais 24; topo 60 (área segura); 20 entre blocos.
- Card: raio 24. Input: 16. Botão: pílula com altura 56. Chip: altura 40. Sheet: 32 no topo.

### Componentes (página `Componentes`, quadro "Sistema · Componentes")
Cada componente do Figma vira um componente React Native em `packages/ui` **com o mesmo nome e as mesmas props**. Variantes do Figma viram props de união (`tone: 'brand' | 'success' | ...`). Propriedades de texto e booleanas viram props comuns.

| Grupo | Componente (Figma) | Variantes / props principais |
|---|---|---|
| Botões | `Botão/Primário` | Estado: Padrão, Desabilitado, Carregando · Texto |
| | `Botão/Secundário` | Texto, Ícone (opcional) |
| | `Botão/Ícone`, `Botão/Fechar` | 48×48 / 40×40 redondos |
| | `Botão/Texto` | Tom: Marca, Neutro, Erro |
| | `Botão/Destrutivo` | Texto |
| Formulário | `Formulário/Input` | Estado: Padrão, Foco, Preenchido, Erro, Desabilitado · Rótulo, Valor, Ajuda, Ícone |
| | `Formulário/Busca` | Estado: Padrão, Foco · Texto |
| | `Formulário/Dígito do código` | Campo do OTP |
| | `Controle/Toggle` · `Rádio` · `Checkbox` | Ligado / Selecionado / Marcado |
| | `Controle/Segmentado` | Opções 2 ou 3 · Ativo · Item 1–3 |
| | `Controle/Slider` | |
| | `Chip` | Padrão, Ativo (largura automática) |
| Exibição | `Avatar` | Tamanho 28/36/40/48/72 × Cor (Roxo, Rosa, Verde, Âmbar, Azul, Teal) · Iniciais |
| | `Selo` | Tom: Marca, Sucesso, Alerta, Erro, Neutro, Pro |
| | `Caixa de ícone` | Tamanho 36/40/44 × Estilo Sutil, Gradiente, Neutro · Ícone |
| | `Progresso/Barra` | Tom × **Progresso 0–100**. No código, use `value: number` contínuo; as variantes de 10 em 10 existem só por limitação do Figma |
| | `Progresso/Anel`, `Skeleton`, `Aviso` (Info, Sucesso, Alerta, Erro), `Nota` | |
| Sobreposição | `Sheet/Base`, `Sheet/Cabeçalho` | Título, Subtítulo, Fechar |
| | `Diálogo` | Tom: Alerta, Erro, Marca, Sucesso · Título, Texto, Confirmar |
| | `Toast`, `Estado vazio` | |
| Estrutura | `Navegação/Header`, `Navegação/Tab Bar`, `Onboarding/Cabeçalho`, `Título de seção`, `Rótulo de grupo`, `Divisor` | |
| Listas e cards | `Lista/Item` | Final: Seta, Valor, Toggle, Nenhum · Título, Subtítulo, Valor, Ícone, Divisor |
| | `Lista/Pessoa` | Final: Seta, Botão, Checkbox, Check, Nenhum |
| | `Lista/Transação`, `Lista/Banco`, `Lista/Categoria`, `Lista/Parcela`, `Lista/Assinatura` (Selo: Nenhum, Sem uso, Reajuste), `Lista/Ranking` | |
| | `Card/Meta`, `Card/Opção`, `Alerta/Item`, `Feed/Post`, `Feed/Reações` | |
| Gráficos | `Gráfico/Coluna`, `Gráfico/Rosca`, `Gráfico/Medidor` | Desenhe com `react-native-svg` |
| Ícones | `Ícone/*` | Traço 1,8, grade 24×24. Exporte os SVGs do Figma; não troque por outra biblioteca |
| Marca | `Logo/Símbolo`, `Logo/Horizontal`, `App Icon` | |

**Ordem para construir:** tema → tipografia → ícones → primitivos (Botões, Controles, Input, Avatar, Selo, Caixa de ícone, Barra) → estrutura (Header, Tab Bar, Sheet, Diálogo) → listas e cards → gráficos. Monte uma tela `/dev/catalogo` (só em desenvolvimento) que mostra todos os componentes e variantes, para comparar com o Figma.

### Padrões de interface
- **Bottom sheets** para escolhas rápidas (período, filtros, categoria, limite) e **diálogos centrais** para confirmações destrutivas (ocultar, sair, excluir, desconectar).
- **Ocultar valores:** o olho na Home troca todos os valores por `R$ ••••`. Existe também a opção "Ocultar valores ao abrir" em Segurança.
- **Toggle:** 48×28, roxo quando ligado.

---

## 5. Navegação (Expo Router)

```
app/
├─ (auth)/
│  ├─ welcome            # Boas-vindas
│  ├─ login              # Entrar (já tem conta)
│  ├─ verify-code        # Código de 6 dígitos (cadastro e login), com sheet "Não recebeu?"
│  └─ invite/[code]      # Chegada por indicação (código aplicado)
├─ (onboarding)/
│  ├─ feeling            # Como você se sente com dinheiro (1 a 5)
│  ├─ goals              # Objetivos (múltipla escolha)
│  ├─ create-account     # Apple / Google / e-mail
│  ├─ permissions        # Notificações e biometria
│  ├─ connect-bank       # Escolher banco (busca), com "Pular" e "Importar fatura"
│  ├─ consent/[bank]     # Autorizar acesso (dados, validade, finalidade)
│  ├─ authorizing        # Abrindo o banco (redirect e volta)
│  ├─ connected          # Banco conectado
│  ├─ connect-error      # Erro de conexão
│  ├─ import-statement   # Importar PDF/OFX
│  └─ analyzing          # Analisando seus gastos
├─ (tabs)/
│  ├─ index              # Início (Home)
│  ├─ gastos/            # Resumo, categoria/[id], transacoes, transacao/[id], busca
│  ├─ futuro/            # Linha do tempo, parcelas, parcela/[id], assinaturas, assinatura/[id], fixos, fatura/[cardId]
│  └─ ia/                # Início do chat, conversa/[id], historico, metas, meta/[id]
├─ sobra                 # Como calculamos a sobra
├─ plano-semana
├─ alertas
├─ perfil/               # perfil, editar, contas, conexao/[id], meu-plano, assinatura, notificacoes, seguranca, privacidade, ajuda
├─ casa/                 # escolher-modo, convidar, compartilhar, convite-enviado, convite/[id], painel, acertar, despesa/[id], config, pessoas-plano
├─ amigos/               # feed, desafios, lista, adicionar, [userId], post/[id], acertos
├─ meta-grupo/           # criar (2 passos), [id], convite/[id]
├─ desafio/              # criar, [id], concluido/[id]
├─ retrospectiva/        # [month] (slides) e compartilhar
├─ indique
├─ paywall               # ?plan=pro | familia
└─ modals/               # sheets: periodo, filtros, mudar-categoria, tipo-gasto, criar-limite, editar-categoria, registrar-valor, dividir, etc.
```

**Tab bar:** Início · Gastos · Futuro · Planor IA. Amigos, Casa, Perfil e Alertas abrem por empilhamento (Perfil pelo avatar da Home; Alertas pelo sino).

---

## 6. Funcionalidades em detalhe

Para cada funcionalidade: objetivo, telas no Figma, regras e casos de borda. Os números de exemplo vêm dos dados fictícios da seção 12.

### 6.1 Onboarding e autenticação
**Fluxo principal:**
1. Boas-vindas.
2. Sentimento (escala de 1 a 5).
3. Objetivos (parcelas, assinaturas, quanto sobra, dívidas, meta).
4. Criar conta (Apple, Google ou e-mail).
5. Código de verificação.
6. Permissões (notificações e biometria).
7. Conectar banco.
8. Autorizar acesso.
9. Abrindo o banco.
10. Banco conectado.
11. Analisando.
12. Home.

**Caminhos alternativos:**
- Entrar (quem já tem conta) → código → Home.
- "Prefiro importar uma fatura" → importar PDF/OFX → Analisando.
- Erro de conexão: tentar de novo, importar fatura ou escolher outro banco.
- "Pular" na tela de conectar banco → **Home sem banco** (estado vazio, ver 6.16).
- "Não recebeu o código?": procurar no spam, reenviar (após 60 s), usar outro e-mail ou falar com o suporte.

**Regras:**
- O login é sem senha: um código de 6 dígitos por e-mail, válido por 10 minutos.
- A barra de progresso do onboarding tem 5 passos.
- **O sentimento e os objetivos são salvos** no perfil. Eles definem o tom da IA e o primeiro plano da semana.
- A biometria é local (desbloqueia o app). Ela não substitui a sessão.
- A tela "Analisando" mostra o progresso real do processamento (transações importadas, assinaturas encontradas, parcelas e plano). Ela não é apenas uma animação.

### 6.2 Conexão bancária (Open Finance)
**Modelo:** usamos um **agregador autorizado** — **Pluggy, no plano "Meu Pluggy"** (gratuito, decidido em 2026-10-07 pra reduzir custo no início — ver §15). O Planor não tem licença própria no Banco Central.

**Fluxo técnico:**
1. O app pede à API um `connectToken` do agregador.
2. O app abre o widget de conexão do agregador, chamado Pluggy Connect. Confirme na documentação se há um pacote oficial de React Native ou se é preciso usar WebView.
3. O usuário escolhe o banco, vê a tela de consentimento e é levado ao app do banco para autorizar.
4. O agregador avisa a API por **webhook** (`item/created`, `item/updated`, `item/error`, `transactions/*`).
5. A API grava o `item` (a conexão), as contas, os cartões e as transações, e dispara o pipeline (6.3).

**Regras:**
- **Consentimento válido por até 12 meses.** Guardar `consentExpiresAt`.
  - Avisar com **7 dias e 1 dia de antecedência**: push, alerta e a tela "Acesso vencendo".
  - Fluxo de renovação: a tela "Renovar acesso" refaz o consentimento.
- Atualização automática a cada **4 a 6 horas** (job) e manual com "Atualizar agora".
  - Em caso de falha, mostrar o sheet "Não conseguimos atualizar o [banco]" com a hora da última atualização.
  - Tentar de novo sozinho, com intervalos crescentes.
- **Desconectar** revoga o consentimento no agregador. O histórico já importado continua no app, sem atualizar.
- O plano Grátis aceita **até 3 bancos**; o Pro, bancos ilimitados.
- **Importar fatura (PDF/OFX)** funciona com qualquer banco:
  - OFX é lido por um parser;
  - PDF tem o texto extraído, que um LLM transforma em JSON estruturado e validado com zod;
  - se o PDF tiver senha, pedir a senha (não guardar).
- **Contas de menores de idade estão fora do escopo**: não há confirmação de que o Open Finance as aceite.
- **Custo:** o agregador é o maior custo fixo. Para validar com orçamento baixo:
  - começar no **sandbox**;
  - fazer um beta fechado pequeno;
  - usar a importação de fatura como alternativa gratuita;
  - avaliar o plano de startup ou a opção gratuita do agregador ("Meu Pluggy").

### 6.3 Pipeline de dados (backend)
Roda a cada nova transação ou atualização, em jobs idempotentes:

1. **Normalização:**
   - valor em centavos e sinal;
   - descrição limpa (sem códigos do banco);
   - `merchantName` normalizado ("IFOOD *PIZZARIA BELLA" → "Pizzaria Bella Massa");
   - data no fuso de Brasília;
   - **remoção de duplicatas** entre conta e cartão e entre reprocessamentos (por id externo e por chave composta).
2. **Categorização:**
   1. regras do usuário (correções que viraram regra);
   2. regras globais (dicionário de comerciantes e palavras-chave);
   3. **LLM barato (Haiku)** só para o que sobrou, com saída em JSON e categoria dentro de uma lista fechada;
   4. guardar `categorySource: 'user_rule' | 'global_rule' | 'ai' | 'manual'` e o grau de confiança.
3. **Categorias padrão:** Moradia, Mercado, Delivery, Transporte, Saúde, Assinaturas, Contas da casa, Lazer, Educação, Compras, Outros. Mais as categorias criadas pelo usuário.
4. **Parcelas:**
   - detectar padrões como `PARC 03/10`, `3/10` e `PARCELA 3 DE 10`;
   - criar ou atualizar um `installmentPlan` com valor, total de parcelas, parcela atual, cartão e data de término;
   - **projetar as parcelas futuras** nas próximas faturas.
5. **Assinaturas e recorrências:**
   - a regra é o mesmo comerciante, com valor parecido (±10%) e intervalo de 28 a 35 dias, por pelo menos 2 ocorrências;
   - separar **assinatura** (serviço digital) de **fixo recorrente** (condomínio, internet, energia, plano de celular);
   - detectar **reajuste** (valor subiu) e **cobrança duplicada**.
6. **Fixo ou variável:** sugerido pela recorrência e pela categoria. O usuário pode trocar.
7. **Gasto fora do padrão:**
   - uma compra é sinalizada quando passa de 1,5× a média da categoria nos últimos 3 meses, **ou** quando a categoria já usou mais de 80% do habitual antes do dia 20;
   - isso gera um alerta.
8. **Uso de assinaturas:**
   - **não é possível detectar o uso pelos dados do banco**;
   - o usuário marca "Uso com frequência", "Uso pouco" ou "Não uso", e essa resposta alimenta as sugestões de corte.
9. **Recalcular agregados** (resumos mensais por usuário, que alimentam telas e IA sem reprocessar transações): `monthly_summary`, `committed_by_month`, previsão da sobra e plano da semana.

### 6.4 Home (Início)
**Topo:**
- saudação e avatar (abre o Perfil);
- selo Planor Pro (abre o paywall, se for Grátis);
- sino com indicador (abre a Central de alertas);
- **"Sobra prevista até [último dia do mês]"** com o olho para ocultar valores. Tocar no valor abre **"Como calculamos a sobra"**;
- barra com a composição (gasto e a vencer) e a frase "De uma renda de R$ X no mês".

**Cálculo (em `packages/shared`):**
```
projectedLeftover = monthlyIncome - spentThisMonth - dueUntilMonthEnd
spentThisMonth   = soma das saídas do mês, contando compras no cartão na DATA DA COMPRA, sem transações ocultas nem transferências entre contas próprias
dueUntilMonthEnd = parcelas + assinaturas + fixos que ainda vencem até o último dia do mês
monthlyIncome    = renda informada no perfil (ou detectada: entradas recorrentes de salário)
```
Exemplo: 6.500,00 − 3.910,10 − 1.341,00 = **1.248,90**.

**Seções da Home:**
- **Card de retrospectiva** ("Sua retrospectiva de setembro chegou"), quando houver uma nova.
- **Já comprometido:**
  - "Novembro já tem R$ 2.340,15 em parcelas e assinaturas";
  - barras dos próximos 4 meses;
  - o link "Ver linha do tempo" leva ao Futuro.
- **Plano da semana:** 3 itens com caixa de seleção e progresso ("1 de 3 feitas"). Abre a tela do plano.
- **Para onde vai seu dinheiro:** grade com 4 cards:
  - gasto do mês, com tendência e comparação com o mês anterior;
  - assinaturas (quantidade, total e "2 sem uso");
  - parcelamentos;
  - fixos x variáveis (medidor).
- **Banner do Pro** (só no plano Grátis).

**Plano da semana:**
- Gerado toda **segunda-feira** a partir dos objetivos do onboarding e dos dados.
- Cada item tem tipo, título, descrição, uma ação que leva a uma tela e um critério de conclusão. Exemplos:
  - "Marcar assinaturas sem uso" vai para a lista de assinaturas;
  - "Segurar o delivery até sexta" vai para a categoria Delivery;
  - "Separar R$ 200 para a reserva" vai para a meta.
- **Sempre que possível, o app marca o item como feito sozinho, pelos dados.**

### 6.5 Gastos
- **Resumo:**
  - navegação por mês (setas; tocar no mês abre o sheet **Escolher período**: este mês, 30 dias, 3 meses, este ano ou datas personalizadas);
  - rosca por categoria e total gasto com a variação em relação ao mês anterior;
  - barra de fixos x variáveis;
  - lista por categoria com valor, % do total e tipo;
  - botão "Ver todas as transações". Os ícones do topo abrem a busca e os filtros.
- **Categoria (ex.: Delivery):**
  - total do mês, número de pedidos e ticket médio;
  - gráfico dos últimos 6 meses com a média;
  - dica da IA com o botão **Criar limite**;
  - lista de transações. O lápis abre **Editar categoria** (nome, ícone, fixo/variável e "Incluir nas análises").
- **Limite de categoria:**
  - criado pelo sheet (slider de R$ 100 a R$ 500, avisar em 80%, começar no mês que vem) ou pela IA;
  - gera alertas e aparece em Metas.
- **Transações:**
  - lista agrupada por dia, com o saldo do dia;
  - chips Todas, Saídas, Entradas e Parcelas;
  - busca por nome **ou por valor** ("62,90"), com buscas recentes e estado sem resultado;
  - **Filtros**: tipo, contas, categorias e faixa de valor.
- **Detalhe da transação:**
  - categoria (o sheet **Mudar categoria** tem a opção "Aplicar a compras parecidas", que cria uma regra), conta, fatura e tipo de gasto (sheet **Tipo de gasto**);
  - "Marcar como recorrente";
  - contexto da IA ("É sua 4ª compra de mercado no mês…");
  - **Despesa da casa** (se houver casa);
  - **Dividir com amigos**;
  - **Ocultar das análises**, com diálogo de confirmação. A transação continua no extrato, mas sai dos totais, das categorias e do plano. Serve, por exemplo, para transferências entre contas próprias.

### 6.6 Futuro
- **Linha do tempo:**
  - "Já comprometido até [mês]", com o total e barras dos próximos 6 meses;
  - chips Tudo, Parcelas, Assinaturas e Fixos;
  - bloco do mês selecionado com Parcelas, Assinaturas e Fixos recorrentes;
  - cards de **fatura por cartão** (valor e vencimento);
  - card "Posso comprar?" (simulador, **v2**).
- **Parcelas:**
  - resumo com o valor por mês e quanto falta pagar;
  - lista com barra de progresso, como "3 de 10 · Nubank · termina em jul/27 · falta R$ 1.680,00";
  - **detalhe** com anel de progresso, total, já pago, falta, próxima e última parcela, e a dica sobre quitar antecipado;
  - **editar** (nome, categoria, aviso antes da última parcela, "Já quitei antecipado").
- **Assinaturas:**
  - total por mês e por ano;
  - aviso "2 você marcou como sem uso. Cancelar economiza R$ 67,80 por mês";
  - selos "Sem uso" e "Subiu 10%";
  - **ordenar** (maior valor, próxima cobrança, sem uso primeiro, nome).
- **Detalhe da assinatura:**
  - próxima cobrança, cartão, assinante desde, pago no ano e último reajuste;
  - **passo a passo de como cancelar**;
  - botões **"Já cancelei"** (tira da previsão e confirma se a cobrança voltar) e **"Me lembrar 3 dias antes da cobrança"**;
  - o selo abre **"Você usa esse serviço?"**.
- **Fixos recorrentes:**
  - lista com o dia e o cartão ou conta; contas variáveis, como a energia, são **estimadas** pela média de 3 meses;
  - **"Nova conta fixa"** manual (nome, valor, dia e pago com).
- **Fatura do cartão:** total comprometido, datas de fechamento e vencimento, e quebra por parcelas, assinaturas e fixos. Leva às transações do cartão.

### 6.7 Planor IA (chat)
- **Início do chat:**
  - status "Lendo seus dados de N bancos";
  - sugestões de perguntas;
  - campo de texto com microfone (conversa por voz: ouvir, transcrever e enviar);
  - **histórico de conversas**.
- **Respostas** podem trazer **cards ricos**: um gráfico da categoria, uma proposta de limite (botões "Criar meta" e "Ajustar valor") ou uma simulação.
- **Ferramentas (function calling)**, todas executadas no backend com SQL determinístico:
  - `get_spending_by_category(period)`
  - `get_category_detail(categoryId, months)`
  - `list_subscriptions(filter)`
  - `list_installments()`
  - `get_committed_by_month(months)`
  - `get_projected_leftover()`
  - `search_transactions(query, period)`
  - `simulate_purchase(amountCents, installments)` (v2)
  - `create_category_limit(categoryId, amountCents)` (pede confirmação ao usuário)
  - `create_goal(name, targetCents, deadline)` (pede confirmação)
  - `get_goals()` / `get_weekly_plan()`
- **Modelos:**
  - um modelo barato classifica a intenção;
  - um modelo intermediário conduz a conversa e as ferramentas;
  - usar prompt caching no prompt de sistema e no "perfil financeiro" resumido.
- **Cotas:** o plano Grátis tem **10 perguntas por mês**, e o sheet "Suas 10 perguntas de outubro acabaram" leva ao Pro. O Pro é ilimitado, com limite de uso justo e de tokens por resposta.
- **Guardrails:**
  - nunca inventar números; se a consulta não trouxer nada, dizer que não sabe;
  - **não recomendar produto de investimento específico** (exigiria autorização da CVM); falar só em princípios;
  - antes de mandar dados ao modelo, tirar CPF, números de conta e nomes de terceiros;
  - tom acolhedor, sem julgar, ajustado ao "sentimento" do onboarding.

### 6.8 Metas (pessoais)
- **Lista:**
  - seção "Em grupo" (convites e metas em grupo) e seção "Só suas";
  - cada meta mostra a barra de progresso e uma linha de contexto, como "Faltam R$ 1.800 · no ritmo atual, em dezembro".
- **Nova meta:** nome, valor e prazo, com a conta "Dá R$ 333,33 por mês. Cabe no seu orçamento?". Também pode ser criada pela IA.
- **Detalhe:**
  - valor e percentual;
  - **ritmo sugerido**, que é o valor que falta dividido pelas semanas ou meses até o prazo;
  - histórico de depósitos;
  - **"Registrar valor guardado"**, um sheet com valor e onde guardou (Caixinha, Poupança, Outro).
- **O dinheiro não é movido.** A tela explica: "O Planor não movimenta seu dinheiro."
- **Limite de categoria** também aparece como um tipo de meta, por exemplo "Limite de delivery R$ 0 de R$ 300 por mês".

### 6.9 Alertas e notificações
**Central de alertas:**
- grupos Hoje e Ontem;
- chips Todos, Não lidos e Importantes;
- "Marcar todos como lidos".

**Tipos (`alertType`) e quando disparar:**

| Tipo | Gatilho | Destino |
|---|---|---|
| `charge_upcoming` | 3 dias antes de assinatura ou fixo | Detalhe da assinatura |
| `subscription_price_up` | Reajuste detectado | Lista de assinaturas |
| `subscription_new` | Nova recorrência detectada | Detalhe |
| `unused_subscription_reminder` | Marcada como sem uso, 3 dias antes da cobrança | Detalhe |
| `unusual_spend` | Gasto fora do padrão | Detalhe da transação |
| `installment_new` | Nova compra parcelada | Detalhe da parcela |
| `statement_closing` | Fatura fecha em 3 dias | Fatura |
| `limit_80` / `limit_exceeded` | Limite de categoria | Categoria |
| `consent_expiring` | 7 dias e 1 dia antes | Acesso vencendo |
| `bank_disconnected` / `sync_failed` | Erro do agregador | Contas e cartões |
| `weekly_plan_ready` | Segunda, 9h | Plano da semana |
| `weekly_summary` | Segunda, 9h (opcional) | Home |
| `monthly_recap_ready` | Dia 1º | Retrospectiva |
| `household_*` | Convite aceito, despesa nova, acerto | Casa |
| `social_*` | Aplauso, comentário, convite para meta ou desafio, desafio | Feed ou desafio |
| `trial_ending` / `billing_issue` | RevenueCat | Assinatura |

**Preferências:**
- **Notificações:** liga e desliga por tipo, e horário silencioso (22h às 8h por padrão).
- **Envio:** os pushes são agrupados (no máximo N por dia) e respeitam o horário silencioso.

### 6.10 Perfil e configurações
- **Perfil:**
  - avatar, nome, e-mail e card do plano (Grátis/Pro);
  - Conta: contas e cartões, importar fatura, meu plano;
  - Preferências: notificações, segurança, privacidade, Planor no WhatsApp (Pro, **v2**);
  - Juntos: família e casal, amigos e feed, indique e ganhe;
  - Suporte: ajuda e sair da conta.
- **Editar perfil:** nome, **renda mensal** (usada na sobra) e **dia em que recebe**.
- **Contas e cartões:**
  - lista por banco, com saldo da conta e fatura do cartão;
  - "Reconectar" quando o consentimento venceu;
  - "Conectar outro banco".
- **Detalhe da conexão:**
  - status, data de autorização, validade, dados compartilhados e finalidade;
  - "Atualizar agora" e **"Desconectar"**, com diálogo de confirmação.
- **Segurança:**
  - entrar com biometria;
  - bloquear ao sair do app (depois de 1 min);
  - ocultar valores ao abrir;
  - trocar e-mail;
  - **aparelhos conectados**, com a opção "Sair" em outro aparelho.
- **Privacidade e dados:**
  - consentimentos ativos;
  - **exportar meus dados** (planilha);
  - usar dados anônimos (opcional, desligado por padrão);
  - política de privacidade e termos;
  - **excluir conta**: diálogo de confirmação, apaga os dados e revoga os consentimentos em até 30 dias.
- **Ajuda:** busca, perguntas frequentes e "Falar com o suporte" (resposta em até 1 dia útil).
- **Sair da conta:** diálogo de confirmação.

### 6.11 Família e casal (casa compartilhada)
**Configuração:**
1. Escolher o modo: **Casal** (2 pessoas), **Família** (até 5) ou **Dividir moradia** (amigos que moram juntos).
2. Convidar por celular, e-mail ou link (válido por 7 dias).
3. Escolher **o que entra na casa**: categorias com liga e desliga, como Moradia, Mercado e Contas da casa ligadas, e Delivery só quando o usuário marcar.
4. Escolher **como dividir**:
   - **meio a meio**;
   - **pela renda**, proporcional à renda informada por cada um, por exemplo 54% e 46%;
   - ou valores personalizados.
5. Convite enviado → convite recebido (visão da outra pessoa, com as regras e a privacidade) → aceitar.

**Privacidade:** cada pessoa só compartilha as categorias que escolheu. Saldos e outros gastos continuam privados.

**Painel da casa:**
- gastos da casa no mês;
- **quem pagou quanto** (barra);
- "Pela divisão 54/46, a Ana te deve R$ 790,25", com o botão **Acertar**;
- gastos por categoria (quem pagou);
- próximas contas da casa;
- meta da casa, com a contribuição de cada pessoa.

**Cálculo do acerto (em `packages/shared`, com teste):**
```
para cada pessoa p:
  parte(p)  = total_da_casa × percentual(p)
  pagou(p)  = soma das despesas da casa pagas por p
  saldo(p)  = pagou(p) − parte(p)
quem tem saldo negativo deve; quem tem saldo positivo recebe (com mais de 2 pessoas, minimizar o número de transferências)
```
Exemplo: total 3.120,00. Bruno: parte 1.684,80 e pagou 2.475,05, saldo +790,25. Ana: parte 1.435,20 e pagou 644,95, saldo −790,25.

**Ações:**
- **Mandar cobrança:** uma mensagem pronta com a chave Pix para compartilhar. **O Planor não transfere dinheiro.**
- **Registrar acerto:** valor, data e "Fechar o mês" (zera o saldo).
- **Despesa da casa:** mudar a divisão de uma despesa (pela renda, meio a meio ou só eu) ou tirá-la da casa.
- **Configurações da casa:** pessoas, convidar, divisão, categorias, avisos e **sair da casa**.

**Plano:** o modo casa faz parte do **Pro Família**.

### 6.12 Amigos, feed, desafios, metas em grupo e despesas divididas
O **hub Amigos** tem 3 abas: **Feed**, **Desafios** e **Amigos**.

**Amigos:**
- adicionar por @usuário, QR code ou link de convite;
- pedidos de amizade (aceitar ou recusar);
- perfil do amigo, mostrando só o que vocês fazem juntos: metas, despesas divididas e desafios;
- desfazer amizade.

**Regra de privacidade fixa:** amigos **nunca** veem saldo, renda, gastos nem transações.

**Feed:**
- publicações de **conquistas** (dia N de um desafio, progresso de meta em %, retrospectiva, recorde);
- **aplaudir** e **comentar**, com tela de comentários;
- "Compartilhar conquista": escolher a conquista, legenda e quem vê (todos os amigos, um grupo ou uma pessoa);
- **Privacidade do feed**:
  - mostrar valores em reais (desligado por padrão);
  - publicar conquistas sozinho (desligado por padrão);
  - mostrar minha posição nos desafios;
  - quem vê;
- prever **denunciar e bloquear** (moderação).

**Desafios:**
- **Modelos:** Sem delivery, Semana sem cartão, Mercado com lista, R$ 10 por dia, Sem compra por impulso.
- **Criar:** duração de 7, 15 ou 30 dias, 1 folga por semana, convidar amigos e um combinado opcional em texto livre (ex.: "Quem perder paga o açaí"). Não há dinheiro envolvido no app.
- **Verificação automática pelas transações sempre que possível.** Por exemplo, "nenhuma transação na categoria Delivery hoje". Quando não der, como em "Guardar R$ 10", o usuário registra.
- **Ranking** por dias cumpridos (nunca por valor).
- **Detalhe:** "Hoje: nenhum pedido até agora", o combinado e a economia estimada (que **só o próprio usuário vê**).
- **Concluído:** medalha e posição, com opções de compartilhar no story, postar no feed ou começar outro desafio.

**Meta em grupo** (ex.: "Viagem pra Floripa", R$ 6.000, 4 pessoas, até 15/jan):
- **Criação em 2 passos:**
  1. ícone, nome, valor total e prazo;
  2. participantes e divisão (igual ou valores diferentes), com a conta "R$ 1.500,00 para cada um · cerca de R$ 500,00 por mês".
- **Detalhe:**
  - total e % do grupo;
  - quanto cada pessoa já guardou;
  - "Cutucar" quem está atrás;
  - feed de atividade;
  - dica da IA sobre o ritmo;
  - "Registrar minha parte", com a opção "avisar o grupo".
- **Convite recebido:** mostra a sua parte e o valor por mês, com "Entrar na meta" ou "Agora não".
- **O dinheiro não é juntado.** Cada pessoa guarda no próprio banco e registra no app.

**Dividir despesa** (no detalhe da transação):
- escolher amigos e a forma de dividir (igual, valores diferentes ou "eu paguei tudo");
- **na análise de gastos entra só a sua parte**.

**Acertos com amigos:**
- totais "Te devem" e "Você deve";
- lista dos acertos em aberto, com Cobrar ou Pagar (Pix fora do app);
- histórico dos acertados.

### 6.13 Retrospectiva do mês
- **Gerada no dia 1º** para o mês anterior (job). Aparece em um card na Home e em uma notificação.
- **Slides em formato de story** (4 slides, toque para avançar, barras de progresso):
  1. capa;
  2. **quanto guardou** (por meta);
  3. **recorde**, por exemplo dias sem delivery comparados à média dos usuários;
  4. **perfil do mês** (ex.: "O Planejador"), com 3 comportamentos.
- **Tela de compartilhar:**
  - formato **Story 9:16** ou **Card 4:5**, com prévia em carrossel dos templates;
  - opção **"Mostrar valores em reais"**: desligada, troca os valores por porcentagens;
  - botões **"Adicionar ao story do Instagram"**, Salvar imagem, Postar no feed e Mais.
- **Templates (no Figma):**
  - resumo do mês, nas versões com e sem valores;
  - conquista;
  - meta em grupo (anel de progresso);
  - perfil do mês;
  - card 4:5 ("Guardei 6% da renda").
- **Geração da imagem:**
  - o template é renderizado num componente fora da tela e capturado com `react-native-view-shot` em **1080×1920** (story) ou **1080×1350** (card);
  - a imagem é compartilhada com `react-native-share`, usando Instagram Stories e o App ID da Meta;
  - todos os templates levam a marca e "planor.app".
- **Regras dos perfis de mês:** um conjunto fixo de perfis, cada um com uma regra determinística (ex.: "O Planejador" = conferiu a fatura antes de fechar e guardou antes de gastar). A IA só escreve o texto.

### 6.14 Indique e ganhe
- Cada usuário tem um código (ex.: `BRUNO7K2`) e um link `planor.app/c/CODIGO`.
- **A recompensa é 1 mês de Pro para quem indicou e para quem foi indicado.** Ela só vale quando **o indicado cria a conta e conecta o primeiro banco** (regra contra fraude).
- **Limite de 12 meses de Pro grátis por ano.**
- **Tela principal:**
  - código com o botão Copiar;
  - "Compartilhar convite";
  - contadores de amigos convidados e meses disponíveis;
  - lista de convites com o status de cada um (enviado, criou a conta, conectou o banco).
- **Recompensa:** um sheet "O Rafa conectou o banco!" com as opções "Ativar meu mês de Pro" ou "Guardar para depois".
- **Quem chega pelo convite:** vê "O Bruno te deu 1 mês de Pro", com o código já aplicado.
- **Implementação:** deep link com o código, atribuição no cadastro e concessão do benefício pelo **RevenueCat** (entitlement promocional) quando o webhook do agregador confirmar o primeiro item conectado.

### 6.15 Planos, paywall e assinatura
| Plano | Preço | Inclui |
|---|---|---|
| **Grátis** | R$ 0 | Até 3 bancos, painel completo, alertas básicos, 10 perguntas à IA por mês, amigos e feed |
| **Pro** | R$ 14,90/mês ou **R$ 119/ano** (≈ R$ 9,92/mês, "economize 33%") | Bancos ilimitados, IA ilimitada, aviso antes de cada cobrança e reajuste, metas e plano personalizados, WhatsApp (v2) |
| **Pro Família** | R$ 22,90/mês ou **R$ 179/ano** (≈ R$ 14,92/mês, "economize 35%") | Pro para até 5 pessoas, casa compartilhada, acertos, metas em conjunto ilimitadas |

- **Teste grátis de 7 dias** no plano anual, com aviso 2 dias antes da cobrança.
- **Paywall:** benefícios, escolha entre anual (padrão) e mensal, "Testar 7 dias grátis" e "Restaurar compra".
- **Cobrança pela loja:** é obrigatório usar a compra dentro do app da App Store ou do Google Play para assinatura digital, via RevenueCat. O cancelamento é feito na loja; a tela explica o passo a passo e abre a loja.
- **Telas de assinatura:**
  - **Sua assinatura**: plano, status do teste, próxima cobrança, pessoas no plano, trocar de plano, recibos e cancelar;
  - **Antes de cancelar**: o que se perde, a economia gerada e a alternativa mais barata;
  - **Cancelar na loja**;
  - **Teste acabando**: resumo do valor entregue no teste;
  - **Pagamento não aprovado**: período de carência; o Pro continua ativo até a data limite;
  - **Pessoas no plano**: 2 de 5 vagas, convidar para as vagas livres.
- **Fonte da verdade:** o backend guarda o `entitlement` a partir dos **webhooks do RevenueCat**, e o app consulta o backend. Nunca confiar só no app.
- **Pro ativado:** tela de boas-vindas que lista o que foi liberado.

### 6.16 Estados globais
- **Home sem banco:**
  - sobra "R$ —" e "Conectar meu banco";
  - checklist de primeiros passos (criar conta e escolher objetivos marcados; conectar banco; ver o primeiro plano);
  - alternativa "Importar fatura";
  - selo de segurança.
- **Carregando:** skeleton com a mensagem "Atualizando Nubank e Itaú…".
- **Estados vazios:** metas, busca sem resultado, feed sem amigos, sem transações e sem alertas. Cada um tem uma ação clara.
- **Sem internet:** faixa "Mostrando dados de hoje, 08:42", com os dados do cache persistido do React Query. Ações que precisam de rede ficam desabilitadas.
- **Erros:** banco fora do ar, sincronização falhou, sessão expirada (volta ao login) e erro genérico com "Tentar de novo".

---

## 7. Modelo de dados (resumo; detalhar no Drizzle)

```
users(id, email, name, avatar_url, monthly_income_cents, payday, feeling_score, goals[], plan, created_at)
devices(id, user_id, platform, push_token, last_seen_at)
settings(user_id, hide_values_on_open, biometric_lock, lock_after_seconds, quiet_hours, ...)
notification_prefs(user_id, alert_type, enabled)

institutions(id, name, logo, aggregator_id)
connections(id, user_id, institution_id, aggregator_item_id, status, consent_expires_at, last_sync_at, error_code)
accounts(id, connection_id, user_id, type[checking|savings|credit_card], name, balance_cents, currency)
credit_cards(account_id, closing_day, due_day, limit_cents)
card_statements(id, account_id, period, closing_date, due_date, total_cents, status)

transactions(id, user_id, account_id, external_id, posted_at, amount_cents, description_raw, merchant_name,
             category_id, category_source, confidence, expense_kind, is_hidden, is_transfer,
             installment_plan_id, recurrence_id, statement_id, note)
categories(id, user_id NULL=global, name, icon, default_kind, include_in_analysis)
category_rules(id, user_id, match_type, pattern, category_id, expense_kind)

installment_plans(id, user_id, account_id, merchant_name, total_cents, installment_cents, count, current, first_date, last_date, settled_early)
recurrences(id, user_id, kind[subscription|recurring_bill], merchant_name, amount_cents, cadence_days, next_charge_at,
            usage[high|low|none|unknown], price_history jsonb, status[active|cancelled_by_user|ended], estimated)
manual_recurring_bills(id, user_id, name, amount_cents, day, paid_with)

monthly_summaries(user_id, month, income_cents, spent_cents, by_category jsonb, fixed_cents, variable_cents)
committed_by_month(user_id, month, installments_cents, subscriptions_cents, bills_cents)

goals(id, owner_id, group_id NULL, type[savings|category_limit], name, icon, target_cents, deadline, category_id, alert_at_pct)
goal_contributions(id, goal_id, user_id, amount_cents, where, created_at)
weekly_plans(id, user_id, week_start, items jsonb)
alerts(id, user_id, type, payload jsonb, read_at, created_at, push_sent_at)

households(id, mode[couple|family|shared_home], split_rule[equal|income|custom], created_by)
household_members(household_id, user_id, role, share_pct, joined_at)
household_categories(household_id, user_id, category_id, enabled)
household_expenses(id, household_id, transaction_id, paid_by, split jsonb)
settlements(id, household_id NULL, from_user, to_user, amount_cents, month, note, created_at)
invites(id, type[household|friend|goal|challenge|referral], code, from_user, to_contact, status, expires_at)

friendships(user_a, user_b, status, created_at)
posts(id, user_id, kind, payload jsonb, audience, show_values, created_at)
post_reactions(post_id, user_id, kind) · post_comments(id, post_id, user_id, text, created_at)
challenges(id, template, starts_at, ends_at, rules jsonb, stake_text, created_by)
challenge_members(challenge_id, user_id, days_done, days_failed, skips_used, status)
split_expenses(id, transaction_id, payer_id, parts jsonb)

monthly_recaps(user_id, month, data jsonb, persona, shared_at)
referrals(code, user_id) · referral_events(code, invited_user_id, status, rewarded_at)
subscriptions(user_id, product, status, period_end, trial_end, store, rc_customer_id)
ai_conversations(id, user_id, title, created_at) · ai_messages(id, conversation_id, role, content, tool_calls jsonb, tokens)
ai_usage(user_id, month, questions_count)
```
**Segurança no banco de dados:**
- Row Level Security no Supabase: cada usuário só lê o que é seu.
- Dados de casa e grupos só são lidos por membros, e **apenas as colunas permitidas**.
- Usar views específicas para o que os amigos podem ver.

---

## 8. API (REST, Fastify), principais rotas

```
POST /auth/...                     (Supabase Auth no app; API valida o JWT)
GET  /me · PATCH /me
GET  /home                         # sobra, composição, comprometido, plano da semana, cards
GET  /forecast/leftover            # detalhamento "Como calculamos a sobra"
POST /connections/token            # connect token do agregador
GET  /connections · POST /connections/:id/sync · DELETE /connections/:id
POST /webhooks/aggregator          # assinado; enfileira jobs
POST /imports                      # upload PDF/OFX → job de extração
GET  /transactions?filters · GET /transactions/:id · PATCH /transactions/:id (categoria, tipo, oculta, nota)
POST /category-rules
GET  /spending/summary?period · GET /spending/category/:id
GET  /future/timeline · /installments · /subscriptions · /bills · /statements/:id
PATCH /subscriptions/:id (usage, cancelled, reminder)
GET/POST/PATCH /goals · POST /goals/:id/contributions
GET  /alerts · POST /alerts/read
POST /ai/chat (stream SSE) · GET /ai/conversations
GET/POST /households · invites · /households/:id/dashboard · /settlements
GET/POST /friends · /feed · /posts/:id/reactions|comments · /challenges · /split-expenses
GET  /recaps/:month
GET  /referrals/me
POST /webhooks/revenuecat
```

## 9. Jobs (pg-boss)
| Job | Quando |
|---|---|
| `sync-connection` | Webhook do agregador, manual, ou a cada 4 a 6 h |
| `process-transactions` | Após cada sincronização: normaliza, categoriza, detecta recorrências e parcelas, recalcula agregados |
| `detect-alerts` | Após o processamento e diariamente às 8h |
| `consent-expiry-check` | Diário |
| `weekly-plan` | Segunda, 6h |
| `weekly-summary-push` | Segunda, 9h |
| `monthly-recap` | Dia 1º, 6h |
| `challenge-daily-check` | Diário, 23h59 |
| `charge-reminders` | Diário |
| `push-dispatcher` | Contínuo; respeita o horário silencioso e o agrupamento |
| `import-statement` | Ao receber um upload |

---

## 10. Segurança, LGPD e regulação
- Dados em trânsito com TLS e em repouso criptografados (Supabase). Segredos nunca no código: usar variáveis de ambiente, com `.env.example` no repositório.
- Biometria e PIN no app; bloqueio automático. Os tokens ficam no `expo-secure-store`.
- **LGPD:**
  - política de privacidade, base legal e encarregado (DPO);
  - **exportar** e **excluir** dados (excluir revoga os consentimentos no agregador);
  - registrar o que é enviado ao provedor de IA (servidores fora do Brasil);
  - usar API em plano que **não treina com os dados**.
- **Anonimizar** antes de mandar ao LLM: sem CPF, números de conta ou nomes de terceiros; só agregados quando possível.
- **CVM:** a IA **não recomenda produto de investimento específico**.
- Logs de acesso; rate limit na API; validação de webhooks por assinatura.
- Pentest antes do lançamento público. É preciso ter CNPJ para contratar o agregador.

## 11. Analytics (PostHog), eventos mínimos
`onboarding_step_viewed`, `account_created`, `bank_connect_started`, `bank_connected`, `bank_connect_failed`, `import_uploaded`, `home_viewed`, `leftover_explained_viewed`, `weekly_plan_item_done`, `subscription_marked_unused`, `subscription_cancelled`, `category_changed`, `limit_created`, `goal_created`, `ai_question_sent`, `ai_quota_reached`, `paywall_viewed`, `trial_started`, `subscription_started`, `household_invite_sent`, `household_joined`, `friend_added`, `post_created`, `challenge_started`, `recap_viewed`, `recap_shared`, `referral_shared`, `referral_rewarded`.

**Métricas-chave:**
- cadastro → banco conectado;
- retenção na semana 4;
- grátis → pago;
- custo de IA por usuário ativo;
- CAC por canal.

---

## 12. Dados fictícios (seed para desenvolver a interface antes do backend)
São os mesmos dados das telas do Figma. Use-os para os mocks e o seed. Os totais batem entre si.

- **Usuário:** Bruno, bruno@email.com, renda R$ 6.500,00, recebe no dia 5. Mês de referência: **outubro/2026**.
- **Mês:**
  - gasto R$ 3.910,10, a vencer R$ 1.341,00, **sobra R$ 1.248,90**;
  - fixos R$ 2.268,00 (58%) e variáveis R$ 1.642,10;
  - gasto 8% maior que em setembro.
- **A vencer em outubro:** parcelas R$ 610,00, contas fixas R$ 623,40 e assinaturas R$ 107,60.
- **Categorias (out):** Moradia 1.450,00 · Mercado 812,40 · Delivery 498,70 (14 pedidos, ticket médio R$ 35,62, média de 6 meses R$ 410) · Transporte 386,20 · Outros 330,40 · Saúde 245,00 · Assinaturas 187,40.
- **Contas:**
  - Nubank: conta R$ 2.140,35; cartão com fatura de novembro R$ 1.482,60 (fecha 03/11, vence 10/11);
  - Itaú: conta R$ 4.380,90; cartão R$ 857,55 (fecha 08/11, vence 15/11); consentimento vence em 12/10/2026;
  - Banco Inter: desconectado (consentimento vencido).
- **Parcelas (R$ 1.120,00 por mês; faltam R$ 4.690,00):**

| Compra | Parcela | Cartão | Valor | Termina | Falta |
|---|---|---|---|---|---|
| Celular | 3/10 | Nubank | R$ 240 | jul/27 | R$ 1.680 |
| Notebook | 7/12 | Itaú | R$ 380 | mar/27 | R$ 1.900 |
| Curso online | 2/6 | Nubank | R$ 160 | fev/27 | R$ 640 |
| Tênis | 1/3 | Nubank | R$ 130 | dez/26 | R$ 260 |
| Geladeira | 5/6 | Itaú | R$ 210 | nov/26 | R$ 210 |

- **Assinaturas (8; R$ 187,40 por mês e R$ 2.248,80 por ano):**
  - Academia 59,90;
  - Streaming de vídeo 39,90 (**sem uso**; reajustou de 34,90 para 39,90; próxima cobrança 12/11; pago em 2026: R$ 364,00);
  - App de idiomas 27,90 (**sem uso**);
  - Música 21,90 (subiu 10%, de 19,90);
  - Jogos 10,00; Notícias 10,00; Nuvem 9,90; Revista 7,90.
  - Cancelar as duas sem uso economiza R$ 67,80 por mês.
- **Fixos recorrentes (nov, R$ 1.032,75):** Condomínio 650,00 (Nubank, dia 3) · Internet 115,20 (Nubank, dia 7) · Plano de celular 54,90 (Itaú, dia 5) · Energia 212,65 (Itaú, dia 8, estimada).
- **Comprometido em novembro: R$ 2.340,15**, que é igual às faturas Nubank + Itaú. Próximos meses: dez 1.980 · jan 1.450 · fev 820.
- **Metas:**
  - Reserva de emergência: R$ 200 de R$ 2.000 (ritmo de R$ 200 por semana, termina em dezembro);
  - Limite de delivery: R$ 300 por mês (começa em novembro);
  - Viagem de fim de ano: R$ 450 de R$ 3.000.
- **Casa (Bruno e Ana, divisão pela renda 54/46):**
  - total R$ 3.120,00 = Moradia 1.450,00 (Bruno) + Mercado 1.120,00 (Bruno 812,40; Ana 307,60) + Delivery 337,35 (Ana) + Contas da casa 212,65 (Bruno);
  - **a Ana deve R$ 790,25**.
- **Amigos:** Ana, Rafa, Júlia e Pedro; pedido pendente da Marina.
  - Meta em grupo "Viagem pra Floripa": R$ 6.000, até 15/01; Rafa 900, Bruno 600, Júlia 450, Pedro 300, total 2.250 (37%).
  - Desafio "30 dias sem delivery", dia 9: Júlia 9/9, Bruno 8/9 (usou a folga), Rafa 7/9.
  - Acertos: o Rafa deve R$ 31,45 (pizzaria, R$ 62,90 dividido por 2); você deve R$ 48,00 à Júlia.
- **Plano:** Pro Família em teste até 11/10/2026; indicação `BRUNO7K2`.

---

## 13. Ordem de implementação sugerida
**Fase 0. Base (1 semana)**
- Monorepo, ESLint e Prettier, TypeScript estrito, CI.
- Projeto Expo com Expo Router e tokens do Figma.
- Supabase e Drizzle.
- Sentry e PostHog.

**Fase 1. Interface com dados fictícios**
- Design system: botões, header, tab bar, chips, cards, listas, sheet, diálogo, toggle, skeleton e estados vazios.
- Telas com os dados da seção 12, nesta ordem: Home → Gastos → Futuro → IA (sem modelo) → Perfil.
- Validar a navegação com o protótipo do Figma.

**Fase 2. Conta e dados reais**
- Auth (OTP, Apple e Google), perfil e renda.
- Agregador em **sandbox**: conectar, webhooks e sincronização.
- Pipeline (normalização e categorização por regras), Home e Gastos com dados reais.
- Importar fatura.

**Fase 3. Inteligência**
- Detecção de parcelas, recorrências e reajustes.
- Comprometido, sobra e faturas.
- Alertas e push.
- Plano da semana.
- IA com ferramentas, cotas e histórico.

**Fase 4. Monetização**
- RevenueCat, paywall, teste grátis e telas de assinatura.
- Limites do plano Grátis.

**Fase 5. Juntos e crescimento**
- Casa (família e casal) e acertos.
- Amigos, feed, desafios, metas em grupo e dividir despesa.
- Retrospectiva e compartilhamento nos stories.
- Indique e ganhe.

**v2 e depois:**
- Simulador "Posso comprar?".
- Planor no WhatsApp.
- Lançamento por voz e por foto de nota (gastos sem banco).
- Modo claro.
- Widgets.
- Investimentos (só leitura via Open Finance).
- Ajuda no Imposto de Renda.

---

## 14. Fora do escopo agora
- **Contas de filhos menores de idade:** só depois de confirmar com o agregador se o Open Finance aceita esse tipo de conta. As telas foram removidas do Figma.
- Movimentar dinheiro (pagamentos, Pix, iniciação de pagamento). Exige licença ou parceiro e tem custo maior.
- Recomendação de investimento específica.

## 15. Decisões em aberto (confirmar com os sócios)
1. ~~Qual agregador usar e em qual plano.~~ **Decidido (2026-10-07): Pluggy, plano "Meu Pluggy"
   (gratuito)**, pra reduzir custo no início — ver §6.2. Reavaliar (Belvo, Tecnospeed, ou um plano
   pago do próprio Pluggy) quando o volume de usuários justificar.
2. Limites do plano Grátis. O design atual tem 3 bancos e 10 perguntas; o plano de negócio original falava em 1 banco.
3. Preços finais: validar com a lista de espera e testes de pagamento.
4. Nome definitivo e registro da marca no INPI ("Planor" é provisório).
5. Hospedagem da API (Railway, Render ou Fly) e região mais próxima do Brasil.
6. Provedor de IA final: testar Claude, GPT e Gemini com as mesmas 50 perguntas reais.
7. App ID da Meta para o compartilhamento nos stories do Instagram.
