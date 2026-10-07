// Sobra prevista — CONTEXTO.md §6.4.
//
//   projectedLeftover = monthlyIncome − spentThisMonth − dueUntilMonthEnd
//
//   spentThisMonth   = soma das saídas do mês, contando compras no cartão na DATA DA COMPRA,
//                       sem transações ocultas nem transferências entre contas próprias
//   dueUntilMonthEnd = parcelas + assinaturas + fixos que ainda vencem até o último dia do mês
//   monthlyIncome    = renda informada no perfil (ou detectada: entradas recorrentes de salário)
//
// Esta função é só a conta final — montar `spentThisMonthCents` e `dueUntilMonthEndCents`
// (filtrar ocultas/transferências, somar o que falta vencer) é responsabilidade de quem
// consulta o banco, não deste pacote.

import type { AmountCents } from '../money';

export type ProjectedLeftoverInput = {
  monthlyIncomeCents: AmountCents;
  spentThisMonthCents: AmountCents;
  dueUntilMonthEndCents: AmountCents;
};

export function projectedLeftover(input: ProjectedLeftoverInput): AmountCents {
  return input.monthlyIncomeCents - input.spentThisMonthCents - input.dueUntilMonthEndCents;
}
