// Dinheiro em centavos, como inteiro — nunca float (ver CLAUDE.md, princípio 4).
// Gastos são negativos no banco de dados; a formatação com sinal segue o padrão
// "- R$ 62,90" / "+ R$ 6.500,00" descrito no CONTEXTO.md §3.

export type AmountCents = number;

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** Formata centavos como "R$ 1.248,90", sem sinal. */
export function formatCents(amountCents: AmountCents): string {
  return currencyFormatter.format(amountCents / 100);
}

/** Formata com sinal explícito: "- R$ 62,90" (saída) ou "+ R$ 6.500,00" (entrada). */
export function formatCentsWithSign(amountCents: AmountCents): string {
  const sign = amountCents < 0 ? '- ' : '+ ';
  return sign + currencyFormatter.format(Math.abs(amountCents) / 100);
}

/** Converte um valor em reais (ex.: do formulário) para centavos inteiros. */
export function reaisToCents(reais: number): AmountCents {
  return Math.round(reais * 100);
}
