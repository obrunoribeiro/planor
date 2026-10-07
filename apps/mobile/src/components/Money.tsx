// Valor monetário que respeita o "olho" da Home — CONTEXTO.md §4: "o olho na Home troca todos
// os valores por R$ ••••." Porcentagens não entram aqui (continuam visíveis, como no feed/stories
// — CONTEXTO.md §1).
import { formatCents } from '@planor/shared';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useHiddenValuesStore } from '@/lib/stores/useHiddenValuesStore';

export type MoneyProps = {
  cents: number;
  style?: StyleProp<TextStyle>;
  /** Sufixo exibido depois do valor (ex.: "/mês") — some junto quando o valor está oculto. */
  suffix?: string;
  suffixStyle?: StyleProp<TextStyle>;
};

export function Money({ cents, style, suffix, suffixStyle }: MoneyProps) {
  const hidden = useHiddenValuesStore((state) => state.hidden);

  if (hidden) {
    return <Text style={style}>R$ ••••</Text>;
  }

  return (
    <Text style={style}>
      {formatCents(cents)}
      {suffix ? <Text style={suffixStyle}>{suffix}</Text> : null}
    </Text>
  );
}
