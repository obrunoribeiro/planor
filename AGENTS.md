# Planor — Instruções para assistentes de IA

> Este arquivo existe para Cursor, GitHub Copilot, Codex e outros agentes.
> **As regras completas estão em [`CLAUDE.md`](./CLAUDE.md). Leia-o.**

## ⛔ REGRA Nº 1

**Antes de escrever, alterar ou planejar QUALQUER linha de código neste repositório, leia o arquivo [`CONTEXTO.md`](./CONTEXTO.md) na raiz.**

Ele é a fonte da verdade do produto: funcionalidades, escopo, stack, glossário, design system, modelo de dados, rotas da API, jobs, dados fictícios e ordem de implementação. Não implemente nada "de memória". Se uma decisão mudar, atualize o `CONTEXTO.md` no mesmo commit.

Depois do `CONTEXTO.md`, leia o `CLAUDE.md` (princípios inegociáveis) e o `CONTRIBUTING.md` (branches e PRs).

## ⛔ REGRA Nº 2

**Antes de qualquer commit que termine ou avance um pedaço de fase, atualize o [`PROGRESSO.md`](./PROGRESSO.md)** — o que foi feito, o que falta da fase, e qualquer desvio do `CONTEXTO.md` original (com o motivo). Regras completas em `CLAUDE.md`.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
