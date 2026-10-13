// Textos que têm dinheiro no meio (ex.: "Separar R$ 6.466,23 para a fatura", do plano da semana)
// também obedecem ao olho da Home — CONTEXTO.md §4: "troca todos os valores por R$ ••••".
import { useHiddenValuesStore } from '@/lib/stores/useHiddenValuesStore';

const MONEY_IN_TEXT = /R\$\s?-?[\d.]+,\d{2}/g;
// Valor pela metade no fim do texto ("R$ 1.720,") — a resposta da Planor IA chega aos pedaços.
const PARTIAL_MONEY_AT_END = /R\$\s?-?[\d.,]*$/;

export function useMaskedMoneyText(): (text: string) => string {
  const hidden = useHiddenValuesStore((state) => state.hidden);
  return (text) =>
    hidden ? text.replace(MONEY_IN_TEXT, 'R$ ••••').replace(PARTIAL_MONEY_AT_END, 'R$ ••••') : text;
}
