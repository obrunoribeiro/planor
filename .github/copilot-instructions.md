# Instruções para o GitHub Copilot — Planor

**Antes de sugerir ou escrever qualquer código, leia o `CONTEXTO.md` na raiz do repositório.** Ele define produto, escopo, stack, glossário, design system, modelo de dados e rotas da API. Leia também o `PROGRESSO.md` — o que já é real no código vs. o que ainda é mock, e o que falta de cada fase. As regras completas estão em `CLAUDE.md`; o setup do ambiente local e o fluxo de branches em `CONTRIBUTING.md`.

Não violável: o app nunca move dinheiro; a IA nunca faz conta (números vêm do backend); dinheiro sempre em centavos inteiros (`amountCents`); datas em UTC no banco e `America/Sao_Paulo` nos cálculos; textos da UI em pt-BR; dark mode primeiro com tokens do Figma.

**Antes de qualquer commit que termine ou avance um pedaço de fase, atualize o `PROGRESSO.md`** — o que foi feito, o que falta da fase, e qualquer desvio do `CONTEXTO.md` original (com o motivo).
