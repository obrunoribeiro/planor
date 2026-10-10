// Textos que têm dinheiro no meio (ex.: "Separar R$ 6.466,23 para a fatura", do plano da semana)
// também obedecem ao olho da Home — CONTEXTO.md §4: "troca todos os valores por R$ ••••".
import { useHiddenValuesStore } from '@/lib/stores/useHiddenValuesStore';

const MONEY_IN_TEXT = /R\$\s?-?[\d.]+,\d{2}/g;

export function useMaskedMoneyText(): (text: string) => string {
  const hidden = useHiddenValuesStore((state) => state.hidden);
  return (text) => (hidden ? text.replace(MONEY_IN_TEXT, 'R$ ••••') : text);
}
