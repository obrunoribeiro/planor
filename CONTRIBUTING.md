# Como trabalhar neste repositório

Guia de trabalho em equipe para o Planor. Antes de codar: **leia o [`CONTEXTO.md`](./CONTEXTO.md)** e o [`CLAUDE.md`](./CLAUDE.md).

---

## 1. Primeira vez (cada pessoa, uma vez só)

```bash
git clone git@github.com:<usuario>/planor.git
cd planor
```

Configure seu nome e e-mail (se ainda não fez):

```bash
git config user.name "Seu Nome"
git config user.email "seu@email.com"
```

---

## 2. O modelo de branches

Usamos **trunk-based com feature branches** — simples e suficiente para 2 pessoas.

```
main ────●────────●──────────────●────────●─────▶  sempre funcionando
          \                     /        /
           ●──●──● feat/home ──●        /          Bruno
            \                          /
             ●──●──●── feat/gastos ───●            Amigo
```

- **`main`** é a branch principal. Ela deve **sempre** estar funcionando. Ninguém commita direto nela.
- Cada funcionalidade nasce em uma **branch própria**, criada a partir da `main`.
- Quando a funcionalidade fica pronta, abre-se um **Pull Request (PR)** no GitHub, a outra pessoa revisa, e aí sim entra na `main` (merge).

### Nome das branches

`tipo/descricao-curta-em-kebab-case`

| Tipo | Quando usar | Exemplo |
|---|---|---|
| `feat/` | Funcionalidade nova | `feat/home-sobra-prevista` |
| `fix/` | Correção de bug | `fix/calculo-sobra-fuso-horario` |
| `chore/` | Infra, config, dependências | `chore/setup-turborepo` |
| `docs/` | Só documentação | `docs/atualizar-contexto-metas` |
| `refactor/` | Refatorar sem mudar comportamento | `refactor/extrair-tokens-tema` |
| `test/` | Só testes | `test/divisao-casa` |

Dica: use nomes alinhados com as features do `CONTEXTO.md` §6 — `feat/futuro-assinaturas`, `feat/casa-acerto`, `feat/ia-chat`.

---

## 3. O ciclo de uma feature (o passo a passo do dia a dia)

### 3.1 Atualize sua `main` local

```bash
git checkout main
git pull origin main
```

Faça isso **sempre** antes de criar uma branch nova. Assim sua feature parte do código mais recente.

### 3.2 Crie a branch

```bash
git checkout -b feat/home-sobra-prevista
```

`checkout -b` = cria a branch **e** já muda para ela. Para ver em qual você está: `git branch` (a atual tem `*`) ou `git status`.

### 3.3 Trabalhe e commite

```bash
git add .                  # ou: git add caminho/do/arquivo.tsx
git commit -m "feat(home): adicionar card de sobra prevista"
```

Commite em pedaços pequenos e com sentido. Não acumule 3 dias de trabalho em 1 commit.

**Formato da mensagem** (Conventional Commits, em português, no imperativo):

```
tipo(escopo): o que foi feito

feat(home): adicionar card de sobra prevista
fix(gastos): corrigir total da categoria ao filtrar por período
chore(deps): subir Expo para o SDK 54
docs(contexto): registrar decisão do agregador
test(shared): cobrir cálculo de acerto da casa
```

### 3.4 Envie sua branch para o GitHub

Na primeira vez:

```bash
git push -u origin feat/home-sobra-prevista
```

O `-u` liga sua branch local à remota. Nas vezes seguintes, basta `git push`.

Pode (e deve) dar push mesmo com a feature pela metade — assim a outra pessoa vê que você está mexendo ali, e seu trabalho fica salvo na nuvem.

### 3.5 Antes de abrir o PR: traga a `main` para sua branch

Enquanto você trabalhava, a `main` pode ter andado. Sincronize **antes** de pedir review:

```bash
git pull --rebase origin main
```

O `--rebase` reaplica seus commits **por cima** da main atualizada, deixando o histórico linear e limpo (em vez de criar um commit de merge "Merge branch main into...").

Se der conflito, veja a seção 5.

Depois do rebase, o push precisa de `--force-with-lease` (porque o histórico foi reescrito):

```bash
git push --force-with-lease
```

> Use `--force-with-lease`, **nunca** `--force` puro: ele recusa o push se alguém tiver enviado algo que você ainda não viu. É a rede de segurança.

### 3.6 Abra o Pull Request

No GitHub: aba **Pull requests** → **New pull request** → base `main` ← compare `sua-branch` → **Create pull request**.

No PR escreva:
- **O que** foi feito e **por quê**;
- **Qual seção do `CONTEXTO.md`** isso implementa (ex.: "§6.4 Home");
- **Como testar** (que tela abrir, o que clicar);
- Print ou vídeo, se for tela.

Marque a outra pessoa como **Reviewer**.

### 3.7 Review e merge

A outra pessoa olha o código, comenta se precisar, e aprova. Depois:

- No GitHub, clique em **Squash and merge** (recomendado: junta todos os commits da branch em 1 commit limpo na `main`).
- Clique em **Delete branch** — a branch já cumpriu o papel.

### 3.8 Volte para a `main` e limpe

```bash
git checkout main
git pull origin main
git branch -d feat/home-sobra-prevista      # apaga a branch local já mergeada
git fetch --prune                            # limpa referências de branches remotas deletadas
```

E recomeça do 3.1 para a próxima feature.

---

## 4. Trabalhando em paralelo sem se atrapalhar

A regra prática é **dividir por pasta/feature, não por arquivo**. Conflito acontece quando duas pessoas editam **as mesmas linhas do mesmo arquivo**.

| Situação | Risco de conflito |
|---|---|
| Bruno em `src/features/home/`, amigo em `src/features/gastos/` | Baixíssimo ✅ |
| Os dois mexendo em `src/theme/tokens.ts` | Alto ⚠️ |
| Os dois adicionando dependência no mesmo `package.json` | Médio (conflito em `pnpm-lock.yaml`) ⚠️ |

**Combinados sugeridos:**
1. Antes de começar, avisem um ao outro qual feature cada um vai pegar (use as **Issues** do GitHub ou o quadro do Projects).
2. Arquivos compartilhados (`tokens.ts`, `pt-BR.ts`, schema do Drizzle, `package.json` da raiz) merecem PRs **pequenos e rápidos** — abre, revisa, mergeia no mesmo dia.
3. Dê `git pull --rebase origin main` **todo dia de manhã** na sua branch. Conflito pequeno todo dia é muito mais fácil que conflito gigante na sexta.
4. Branch de vida curta: 1 a 3 dias. Se a feature é grande, quebre em PRs menores.

---

## 5. Quando dá conflito

O Git avisa assim:

```
CONFLICT (content): Merge conflict in apps/mobile/src/theme/tokens.ts
```

Abra o arquivo. Você vai ver:

```
<<<<<<< HEAD
const purple = '#7C5CFF';     ← o que está na main
=======
const purple = '#7457F5';     ← o que está na sua branch
>>>>>>> feat/minha-branch
```

Passo a passo:

1. Edite o arquivo e deixe **só o código final correto** (apague as linhas `<<<<<<<`, `=======` e `>>>>>>>`). Às vezes a resposta é ficar com um lado; às vezes é combinar os dois.
2. Em caso de dúvida sobre valores de produto/design, **o `CONTEXTO.md` decide**.
3. Marque como resolvido e continue:

```bash
git add apps/mobile/src/theme/tokens.ts
git rebase --continue
```

4. Se o rebase virou bagunça e você quer desistir e voltar ao estado anterior:

```bash
git rebase --abort
```

Nada é perdido. `--abort` te devolve exatamente onde você estava.

---

## 6. Comandos de socorro

| Quero... | Comando |
|---|---|
| Ver o que mudei | `git status` e `git diff` |
| Ver o histórico resumido | `git log --oneline --graph --all -20` |
| Desfazer mudanças não commitadas de um arquivo | `git restore caminho/arquivo.ts` |
| Desfazer o último commit, **mantendo** as mudanças | `git reset --soft HEAD~1` |
| Guardar o trabalho pela metade pra trocar de branch | `git stash` → depois `git stash pop` |
| Ver em que branch estou | `git branch` |
| Trocar de branch | `git checkout nome-da-branch` |
| Baixar branches novas do colega | `git fetch origin` |
| Olhar a branch do colega localmente | `git checkout feat/branch-dele` |
| **Recuperar algo que "sumiu"** | `git reflog` (o Git guarda tudo por ~90 dias) |

---

## 7. Proteção da `main` (configurar no GitHub)

Vale a pena ligar isso logo no começo — evita push acidental na `main`.

**Settings → Branches → Add branch ruleset** (ou *Add rule*), para a branch `main`:

- ✅ **Require a pull request before merging** — obriga PR
- ✅ **Require approvals: 1** — obriga a revisão do outro
- ✅ **Require branches to be up to date before merging**
- ✅ **Block force pushes**
- ⬜ *Do not allow bypassing* — deixe desligado no começo, pra não travarem vocês mesmos

> Em repositório **privado**, proteção de branch exige GitHub Team/Pro. Se o repo for privado no plano Free, o botão fica indisponível — nesse caso vale o combinado verbal: **ninguém commita na `main`**.

---

## 8. Checklist antes de abrir PR

- [ ] Li a seção relevante do `CONTEXTO.md` e o código bate com ela
- [ ] Nenhum segredo, `.env` ou dado financeiro real no commit
- [ ] Valores em centavos inteiros (`amountCents`), nunca float
- [ ] Regra de cálculo pura está em `packages/shared` e **tem teste**
- [ ] A tela cobre os 4 estados: carregando, vazio, erro e com dados
- [ ] Textos em pt-BR, vindos do `i18n`
- [ ] Cores e tamanhos vêm dos tokens, não hardcoded
- [ ] `git pull --rebase origin main` feito, sem conflito pendente
- [ ] Lint e typecheck passando
