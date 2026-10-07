# Como trabalhar neste repositório

Guia de trabalho em equipe para o Planor. Antes de codar: **leia o [`CONTEXTO.md`](./CONTEXTO.md)** e o [`CLAUDE.md`](./CLAUDE.md).

---

## 1. Primeira vez (cada pessoa, uma vez só)

```bash
git clone git@github.com:<usuario>/planor.git
cd planor
pnpm install
```

Configure seu nome e e-mail (se ainda não fez):

```bash
git config user.name "Seu Nome"
git config user.email "seu@email.com"
```

---

## 1.5 Ambiente de desenvolvimento

O banco de dados (Supabase/Postgres) e o Pluggy são **compartilhados** — um projeto só para as
duas pessoas. A API e o app Expo, não: **cada pessoa roda a própria cópia, na própria máquina.**

### Credenciais

Peça pra quem já tem o projeto configurado (hoje, o Bruno) te passar o conteúdo do `.env` por um
canal seguro — **nunca por commit, PR, issue ou mensagem de chat em texto puro**. O
`SUPABASE_SERVICE_ROLE_KEY` em especial dá acesso total ao banco, sem as proteções normais; trate
como senha. Copie pra um `.env` na raiz do repo (o `.env.example` mostra todas as chaves
esperadas; esse arquivo nunca vai pro git).

### A única linha que você edita sozinho: `EXPO_PUBLIC_API_URL`

Todo o resto do `.env` é igual pros dois. Essa linha, não — ela aponta pro endereço onde **a sua
própria API local** vai estar escutando, pra o app no **seu** celular conseguir chamá-la.

1. Descubra o IP da sua máquina na sua rede Wi-Fi:
   ```bash
   ipconfig getifaddr en0        # macOS, Wi-Fi
   ```
2. No seu `.env`:
   ```
   EXPO_PUBLIC_API_URL=http://SEU_IP_AQUI:3333
   ```
3. Seu celular precisa estar **na mesma rede Wi-Fi** do computador que está rodando a API. Esse
   IP muda se você trocar de rede (casa → trabalho, por exemplo) — repita o passo 1 e atualize o
   `.env` quando isso acontecer.

### Rodando tudo

Dois terminais abertos ao mesmo tempo:

```bash
# Terminal 1 — API
pnpm --filter @planor/api dev

# Terminal 2 — app
pnpm --filter @planor/mobile dev
```

Escaneie o QR code do terminal 2 com o **Expo Go no seu próprio celular**. Depois de editar o
`.env`, reinicie os dois processos (`Ctrl+C` e roda de novo) — variáveis `EXPO_PUBLIC_*` só são
lidas quando o Expo sobe, Fast Refresh não pega mudança de `.env`.

### Sua conta

Cadastre-se pelo próprio app, com o seu e-mail (código por e-mail, sem senha). Isso cria sua
própria linha real em `auth.users` e `public.users` no banco compartilhado. **Os dados fictícios
do seed (CONTEXTO.md §12) hoje só são anexados à conta do Bruno** — o `packages/db/src/seed.ts`
busca o e-mail dele especificamente. Pra você, Home/Gastos vão aparecer no estado vazio (o que,
aliás, é uma boa forma de testar esse estado) até o seed ganhar suporte a mais de uma identidade.

### Login com Google no Expo Go

O Supabase só redireciona de volta pro app depois do login no Google se a URL de retorno estiver
na lista "Redirect URLs" (Authentication → URL Configuration, no dashboard do Supabase — é
compartilhada, então quem adicionar já resolve pros dois). Como estamos testando pelo **Expo Go**
(não um build de verdade), essa URL inclui o IP da sua máquina, que muda de rede em rede — em vez
de cadastrar o IP exato (e ter que atualizar toda vez que ele mudar), adicione o coringa:

```
exp://**
```

Isso cobre qualquer IP/porta que o Expo Go usar. Quando o app ganhar um build de desenvolvimento
de verdade (EAS dev client) em vez do Expo Go, o redirecionamento passa a ser fixo
(`planor://**`) — pode adicionar esse também desde já, não tem custo.

### Open Finance (Pluggy) em desenvolvimento

O Planor usa o Pluggy (plano "Meu Pluggy", gratuito — CONTEXTO.md §6.2) pra conectar bancos de
verdade. Pra testar local:

1. **Credenciais:** crie uma conta em [meu.pluggy.ai](https://meu.pluggy.ai) conectando um banco
   seu (é o que dá acesso ao "demo application"), depois pegue o Client ID/Secret no
   [Pluggy Dashboard](https://dashboard.pluggy.ai). Cole em `PLUGGY_CLIENT_ID` e
   `PLUGGY_CLIENT_SECRET` no `.env` — são compartilhados entre vocês dois, igual o resto do
   `.env` (não são por-pessoa, ao contrário do `EXPO_PUBLIC_API_URL`).
2. **Túnel público pro webhook:** o Pluggy precisa alcançar `/webhooks/aggregator` de fora da
   rede local. Com a API rodando (`pnpm --filter @planor/api dev`), em outro terminal:
   ```bash
   ngrok http 3333
   ```
   Copia a URL `https://....ngrok-free.app` e coloca em `PLUGGY_WEBHOOK_BASE_URL` no `.env`.
3. **Registrar o webhook** (precisa repetir toda vez que a URL do ngrok mudar — plano grátis do
   ngrok muda a cada reinício, igual o IP do Expo Go):
   ```bash
   pnpm --filter @planor/api pluggy:register-webhook
   ```
4. **Testar sem banco de verdade:** o widget usa `includeSandbox` em dev, que mostra o conector
   de testes "Pluggy Bank". Login: usuário `user-ok`, senha `password-ok` (MFA, se pedir:
   `123456`). Outros usuários de teste simulam erro/conta bloqueada/etc. — ver
   `apps/api/src/lib/pluggy.ts`.

Sem o túnel rodando e o webhook registrado, conectar um banco ainda funciona (o app sincroniza na
hora via `POST /connections/sync-item`, chamado assim que o widget fecha com sucesso) — só a
**atualização automática depois** (webhook chegando sozinho quando o banco manda nova transação)
que não vai funcionar sem isso.

### ⚠️ `pnpm db:seed` é destrutivo e compartilhado

Esse comando **apaga e recria todas as tabelas de dados do produto** no banco — que é o mesmo
banco pra vocês dois. Nunca rode sem avisar a outra pessoa antes; combine um horário, ou melhor,
evite rodar fora de quando for realmente necessário (ex.: depois de mudar o schema).

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
