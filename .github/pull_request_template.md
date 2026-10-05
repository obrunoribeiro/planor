## O que muda

<!-- Descreva em 1-3 linhas o que este PR faz -->

## Seção do CONTEXTO.md

<!-- Ex.: §6.4 Home — card "Sobra prevista" -->

## Como testar

1.
2.

## Prints / vídeo

<!-- Se mexeu em tela -->

## Checklist

- [ ] Li a seção relevante do `CONTEXTO.md` e o código bate com ela
- [ ] Nenhum segredo, `.env` ou dado financeiro real no commit
- [ ] Valores em centavos inteiros (`amountCents`), nunca float
- [ ] Regra de cálculo pura está em `packages/shared` e tem teste
- [ ] A tela cobre os 4 estados: carregando, vazio, erro e com dados
- [ ] Textos em pt-BR, vindos do `i18n`
- [ ] Cores e tamanhos vêm dos tokens, não hardcoded
- [ ] `git pull --rebase origin main` feito
- [ ] Lint e typecheck passando
