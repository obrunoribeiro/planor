// "Mudar categoria" — CONTEXTO.md §6.5: "tem a opção 'Aplicar a compras parecidas', que cria uma
// regra." A regra vale pra próximas transações do mesmo comerciante (não reclassifica as já
// existentes agora — ver PROGRESSO.md).
import { Button, Checkbox, colors, Icon, Sheet, space, typography } from '@planor/ui';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { categoryIcon } from './categoryIcons';
import { useCategoriesQuery, useCreateCategoryRuleMutation, useUpdateTransactionMutation } from '@/lib/api/queries';

export type MudarCategoriaSheetProps = {
  visible: boolean;
  onClose: () => void;
  transactionId: string;
  currentCategoryId: string | null;
  merchantName: string | null;
  descriptionRaw: string;
};

export function MudarCategoriaSheet({ visible, onClose, transactionId, currentCategoryId, merchantName, descriptionRaw }: MudarCategoriaSheetProps) {
  const { data: categories } = useCategoriesQuery();
  const { mutate: updateTransaction, isPending: isSaving } = useUpdateTransactionMutation(transactionId);
  const { mutate: createRule } = useCreateCategoryRuleMutation();
  const [selected, setSelected] = useState<string | null>(currentCategoryId);
  const [applyToSimilar, setApplyToSimilar] = useState(false);

  const onSave = () => {
    if (!selected) return;
    updateTransaction(
      { categoryId: selected },
      {
        onSuccess: () => {
          if (applyToSimilar) {
            createRule({ matchType: 'merchant', pattern: merchantName ?? descriptionRaw, categoryId: selected });
          }
          onClose();
        },
      },
    );
  };

  return (
    <Sheet visible={visible} title="Mudar categoria" onClose={onClose}>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {(categories ?? []).map((category) => (
          <Pressable key={category.id} style={styles.row} onPress={() => setSelected(category.id)}>
            <View style={styles.iconBox}>
              <Icon name={categoryIcon(category.name)} size={18} color={colors.dark.text.primary} />
            </View>
            <Text style={styles.name}>{category.name}</Text>
            {selected === category.id && <Icon name="check" size={18} color={colors.dark.text.brand} />}
          </Pressable>
        ))}
      </ScrollView>

      <Pressable style={styles.applyRow} onPress={() => setApplyToSimilar((v) => !v)}>
        <Checkbox checked={applyToSimilar} accessibilityLabel="Aplicar a compras parecidas" />
        <Text style={styles.applyLabel}>Aplicar a compras parecidas</Text>
      </Pressable>

      <Button label="Salvar" onPress={onSave} loading={isSaving} disabled={!selected} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 320, gap: space[4] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingVertical: space[10],
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.control,
  },
  name: {
    flex: 1,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    color: colors.dark.text.primary,
  },
  applyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[10],
    paddingVertical: space[16],
  },
  applyLabel: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    color: colors.dark.text.primary,
  },
});
