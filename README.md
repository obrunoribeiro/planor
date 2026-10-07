# Planor

App mobile de finanças pessoais (iOS e Android). Conecta os bancos do usuário pelo **Open Finance**, organiza os gastos sozinho e mostra **quanto do dinheiro futuro já está comprometido**.

> **Promessa:** "Saiba hoje quanto sobra no fim do mês."

## 📍 Comece por aqui

| Arquivo | O que é |
|---|---|
| **[`CONTEXTO.md`](./CONTEXTO.md)** | **Fonte da verdade do produto.** Funcionalidades, escopo, stack, glossário, design system, modelo de dados, rotas da API, jobs e dados fictícios. **Leia antes de codar qualquer coisa.** |
| **[`PROGRESSO.md`](./PROGRESSO.md)** | **O que já existe de verdade no código**, o que falta de cada fase, e onde o código foi diferente do `CONTEXTO.md` original (e por quê). Leia pra saber o estado real do projeto sem reconversar tudo do zero. |
| [`CLAUDE.md`](./CLAUDE.md) | Regras do repositório e princípios inegociáveis (vale para pessoas e para assistentes de IA) |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | **Primeira vez rodando o projeto? Comece pela seção "1.5 Ambiente de desenvolvimento"** — `.env`, credenciais compartilhadas, como testar no seu próprio celular. Também tem o fluxo de branches, commits e Pull Requests. |

**Design (fonte da verdade visual):** [Figma — Planor](https://www.figma.com/design/xAWFDxaXDQsvyz6wiCAJnH/Planor)

## Stack

TypeScript em tudo · **React Native + Expo** (Expo Router) · TanStack Query + Zustand · **Node.js + Fastify** · **PostgreSQL (Supabase)** + Drizzle ORM · pg-boss · Pluggy (Open Finance) · Claude via Vercel AI SDK · RevenueCat · Sentry + PostHog. Monorepo **pnpm + Turborepo**.

Detalhes e justificativas: `CONTEXTO.md` §3.

## Estrutura

```
planor/
├─ apps/
│  ├─ mobile/     # Expo + Expo Router
│  └─ api/        # Fastify
└─ packages/
   ├─ db/         # esquema Drizzle + migrações + seed
   ├─ shared/     # tipos, schemas zod, regras de cálculo puras
   └─ config/     # eslint, tsconfig, prettier
```

## Status

🚧 **Fase 2 — Conta e dados reais, em andamento.** Ver a ordem de implementação em
`CONTEXTO.md` §13 e o estado atual, detalhado, em [`PROGRESSO.md`](./PROGRESSO.md).
