# Planor

App mobile de finanças pessoais (iOS e Android). Conecta os bancos do usuário pelo **Open Finance**, organiza os gastos sozinho e mostra **quanto do dinheiro futuro já está comprometido**.

> **Promessa:** "Saiba hoje quanto sobra no fim do mês."

## 📍 Comece por aqui

| Arquivo | O que é |
|---|---|
| **[`CONTEXTO.md`](./CONTEXTO.md)** | **Fonte da verdade do produto.** Funcionalidades, escopo, stack, glossário, design system, modelo de dados, rotas da API, jobs e dados fictícios. **Leia antes de codar qualquer coisa.** |
| [`CLAUDE.md`](./CLAUDE.md) | Regras do repositório e princípios inegociáveis (vale para pessoas e para assistentes de IA) |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Fluxo de branches, commits e Pull Requests |

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

🚧 **Fase 0 — Base.** Ver a ordem de implementação em `CONTEXTO.md` §13.
