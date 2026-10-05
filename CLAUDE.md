# Planor — Regras do repositório

## ⛔ REGRA Nº 1 — LEIA O CONTEXTO ANTES DE QUALQUER IMPLEMENTAÇÃO

**Antes de escrever, alterar ou planejar QUALQUER linha de código neste repositório, leia o arquivo [`CONTEXTO.md`](./CONTEXTO.md) na raiz.**

Isso vale para:
- criar telas, componentes, rotas, endpoints, jobs ou migrações;
- nomear qualquer coisa (variável, tabela, rota, token de design, texto de UI);
- escolher biblioteca, padrão de estado, estrutura de pasta;
- responder dúvidas sobre produto, escopo, regra de negócio ou cálculo.

Não é opcional e não vale "achar que já sabe de memória". O `CONTEXTO.md` é a **fonte da verdade** do produto: funcionalidades, escopo, stack, glossário, modelo de dados, rotas da API, jobs, design system, dados fictícios e ordem de implementação. Se uma decisão mudar, **atualize o `CONTEXTO.md` no mesmo commit** que muda o código.

### Como aplicar a regra na prática

1. **No início de toda tarefa**, leia o `CONTEXTO.md` — pelo menos as seções relevantes. Se a tarefa toca produto/escopo, leia a seção 6 correspondente por inteiro.
2. **Antes de propor um plano**, cite de qual seção do `CONTEXTO.md` cada decisão veio.
3. **Se o `CONTEXTO.md` não cobrir o caso**, não invente: pergunte ao Bruno ou registre a dúvida na seção 15 ("Decisões em aberto").
4. **Se o código contradisser o `CONTEXTO.md`**, o `CONTEXTO.md` vence — a menos que o Bruno diga o contrário por escrito (e aí o `CONTEXTO.md` é atualizado).

### Mapa rápido do CONTEXTO.md

| Precisa de... | Vá para a seção |
|---|---|
| O que é o produto e os princípios inegociáveis | 1 |
| Como nomear as coisas | 2 — Glossário |
| Qual biblioteca / estrutura de pastas / convenções | 3 — Stack técnica |
| Cores, tipografia, medidas, componentes | 4 — Design system |
| Que rota criar / onde a tela mora | 5 — Navegação |
| Regra de negócio de uma feature específica | 6.1 a 6.16 |
| Tabelas e colunas | 7 — Modelo de dados |
| Endpoints | 8 — API |
| Jobs em background | 9 |
| Segurança / LGPD | 10 |
| Eventos de analytics | 11 |
| Dados de mock e seed (os mesmos do Figma) | 12 |
| Em que ordem construir | 13 |
| O que **não** fazer agora | 14 |
| O que ainda não foi decidido | 15 |

---

## Princípios que nunca podem ser violados no código

Resumo do que está na seção 1 do `CONTEXTO.md`. Qualquer PR que viole isso deve ser recusado:

1. **Só leitura.** O Planor **nunca move dinheiro** — não paga, não transfere, não junta dinheiro de grupo. Metas, acertos e mesadas são apenas *registrados* pelo usuário.
2. **A IA nunca faz conta.** Todo número exibido ou dito pela IA vem do backend, por consulta determinística. O modelo só escreve texto em cima de resultado pronto.
3. **Privacidade por padrão.** Amigos nunca veem saldo, renda ou gastos. No feed e nos stories, valores ficam ocultos por padrão. Na casa, só as categorias escolhidas entram.
4. **Dinheiro em centavos, inteiro** (`amountCents: number`). Nunca float. Saídas são negativas no banco.
5. **Datas em UTC no banco**; cálculos de "mês"/"hoje"/vencimento usam `America/Sao_Paulo`.
6. **Textos da UI em pt-BR**, centralizados em `src/i18n/pt-BR.ts`.
7. **Regras de cálculo puras** moram em `packages/shared` e **têm teste unitário** (sobra, divisão da casa, ritmo de meta, acertos).
8. **Toda tela tem 4 estados**: carregando (skeleton), vazio, erro e com dados.
9. **Dark mode primeiro.** Tokens vêm das variáveis do Figma, nunca hardcoded.
10. **Segredos só em variáveis de ambiente**, com `.env.example` versionado. Nada de chave no código.

---

## Fluxo de trabalho em equipe

Este repositório é compartilhado entre o Bruno e mais uma pessoa. Veja [`CONTRIBUTING.md`](./CONTRIBUTING.md) para o fluxo de branches, commits e Pull Requests.

Regras curtas:
- **Nunca commitar direto na `main`.** Sempre branch + Pull Request.
- Nome de branch: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/` + descrição em kebab-case.
- Commits em português, no imperativo: `feat(home): adicionar card de sobra prevista`.
- Antes de abrir PR: `git pull --rebase origin main` e resolver conflito local.
