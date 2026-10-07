// "Tipo de gasto" — CONTEXTO.md §6.5: fixo ou variável, escolhido manualmente na transação.
import { Button, colors, Sheet, space, typography } from '@planor/ui';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useUpdateTransactionMutation } from '@/lib/api/queries';
import type { TransactionDetailResponse } from '@/lib/api/types';

export type TipoDeGastoSheetProps = {
  visible: boolean;
  onClose: () => void;
  transactionId: string;
  currentKind: TransactionDetailResponse['expenseKind'];
};

const OPTIONS: { value: 'fixed' | 'variable'; label: string; description: string }[] = [
  { value: 'fixed', label: 'Fixo', description: 'Valor parecido todo mês (ex.: aluguel, assinatura).' },
  { value: 'variable', label: 'Variável', description: 'Muda de mês pra mês (ex.: mercado, delivery).' },
];

export function TipoDeGastoSheet({ visible, onClose, transactionId, currentKind }: TipoDeGastoSheetProps) {
  const { mutate, isPending } = useUpdateTransactionMutation(transactionId);
  const [selected, setSelected] = useState(currentKind ?? 'variable');

  const onSave = () => {
    mutate({ expenseKind: selected }, { onSuccess: onClose });
  };

  return (
    <Sheet visible={visible} title="Tipo de gasto" onClose={onClose}>
      <View style={styles.options}>
        {OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={[styles.option, selected === option.value ? styles.optionActive : null]}
            onPress={() => setSelected(option.value)}
          >
            <Text style={styles.optionLabel}>{option.label}</Text>
            <Text style={styles.optionDescription}>{option.description}</Text>
          </Pressable>
        ))}
      </View>
      <Button label="Salvar" onPress={onSave} loading={isPending} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  options: { gap: space[12] },
  option: {
    padding: space[16],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    gap: space[4],
  },
  optionActive: {
    borderColor: colors.dark.border.brand,
    backgroundColor: colors.dark.bg.brandSubtle,
  },
  optionLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    color: colors.dark.text.primary,
  },
  optionDescription: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
});
