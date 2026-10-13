// Futuro · Editar parcelamento — CONTEXTO.md §6.6 (nome, categoria, "Já quitei antecipado").
// Node 49:1137 no Figma. "Avisar antes da última parcela" fica de fora até existir push (§6.9):
// sem ele, o aviso seria promessa vazia (mesma decisão do lembrete de assinatura).
import { Button, Chip, colors, Sheet, space, TextField, Toggle, typography } from '@planor/ui';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCategoriesQuery, useUpdateInstallmentMutation } from '@/lib/api/queries';
import type { InstallmentPlanItem } from '@/lib/api/types';

export type EditarParcelamentoSheetProps = {
  plan: InstallmentPlanItem;
  visible: boolean;
  onClose: () => void;
};

export function EditarParcelamentoSheet({ plan, visible, onClose }: EditarParcelamentoSheetProps) {
  const { data: categories } = useCategoriesQuery();
  const { mutate: update, isPending, isError } = useUpdateInstallmentMutation(plan.id);
  const [name, setName] = useState(plan.merchantName);
  const [categoryId, setCategoryId] = useState(plan.categoryId);
  const [settledEarly, setSettledEarly] = useState(plan.settledEarly);

  // Reabrir o sheet volta pro que está salvo.
  useEffect(() => {
    if (!visible) return;
    setName(plan.merchantName);
    setCategoryId(plan.categoryId);
    setSettledEarly(plan.settledEarly);
  }, [visible, plan.merchantName, plan.categoryId, plan.settledEarly]);

  // A categoria atual primeiro, como no Figma ("Outros" ativo na frente).
  const options = [...(categories ?? [])].sort((a, b) => Number(b.id === plan.categoryId) - Number(a.id === plan.categoryId));

  const save = () => {
    const trimmed = name.trim();
    update(
      {
        // Nome vazio ou igual ao detectado volta pro detectado.
        name: trimmed && trimmed !== plan.detectedName ? trimmed : null,
        ...(categoryId !== plan.categoryId ? { categoryId } : {}),
        settledEarly,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Sheet visible={visible} title="Editar parcelamento" onClose={onClose}>
      <TextField label="Nome" value={name} onChangeText={setName} placeholder={plan.detectedName} autoCapitalize="sentences" />
      {options.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.label}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {options.map((category) => (
              <Chip key={category.id} label={category.name} active={categoryId === category.id} onPress={() => setCategoryId(category.id)} />
            ))}
          </ScrollView>
        </View>
      )}
      <View style={styles.row}>
        <View style={styles.texts}>
          <Text style={styles.title}>Já quitei antecipado</Text>
          <Text style={styles.subtitle}>Tira as parcelas restantes da previsão</Text>
        </View>
        <Toggle value={settledEarly} onValueChange={setSettledEarly} accessibilityLabel="Já quitei antecipado" />
      </View>
      {isError && <Text style={styles.error}>Não deu pra salvar agora. Tenta de novo em instantes.</Text>}
      <Button label="Salvar" onPress={save} loading={isPending} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[10] },
  label: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.dark.text.secondary,
  },
  chips: { gap: space[8] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingVertical: space[14],
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border.default,
  },
  texts: { flex: 1, gap: space[2] },
  title: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  subtitle: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  error: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.dark.text.error,
  },
});
