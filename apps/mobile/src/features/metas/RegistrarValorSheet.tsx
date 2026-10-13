// Registrar valor guardado — CONTEXTO.md §6.8 ("um sheet com valor e onde guardou"). Node 51:1295
// no Figma. Só registra: o Planor não move dinheiro.
import { formatCents, reaisToCents } from '@planor/shared';
import { Button, Chip, colors, Sheet, space, TextField, typography } from '@planor/ui';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAddContributionMutation } from '@/lib/api/queries';
import { parseReaisInput } from '@/lib/format';

export type RegistrarValorSheetProps = {
  goalId: string;
  visible: boolean;
  onClose: () => void;
  whereOptions: string[];
  /** Valor sugerido (o ritmo da meta), em centavos. */
  suggestedCents: number | null;
};

export function RegistrarValorSheet({
  goalId,
  visible,
  onClose,
  whereOptions,
  suggestedCents,
}: RegistrarValorSheetProps) {
  const { mutate, isPending, isError } = useAddContributionMutation(goalId);
  const [amount, setAmount] = useState('');
  const [where, setWhere] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setAmount(
      suggestedCents
        ? formatCents(suggestedCents)
            .replace(/^R\$\s?/, '')
            .replace(/\u00a0/g, '')
        : '',
    );
    setWhere(whereOptions[0] ?? null);
  }, [visible, suggestedCents, whereOptions]);

  const value = parseReaisInput(amount);
  const canSave = value !== null && value > 0;

  return (
    <Sheet visible={visible} title="Registrar valor guardado" onClose={onClose}>
      <TextField
        label="Quanto você guardou"
        value={amount}
        onChangeText={setAmount}
        placeholder="200,00"
        keyboardType="decimal-pad"
      />
      {suggestedCents ? <Text style={styles.hint}>Sugestão pelo ritmo da meta</Text> : null}
      <View style={styles.group}>
        <Text style={styles.label}>Onde você guardou?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {whereOptions.map((option) => (
            <Chip
              key={option}
              label={option}
              active={where === option}
              onPress={() => setWhere(option)}
            />
          ))}
        </ScrollView>
      </View>
      {isError && (
        <Text style={styles.error}>Não deu pra registrar agora. Tenta de novo em instantes.</Text>
      )}
      <Button
        label="Registrar"
        disabled={!canSave}
        loading={isPending}
        onPress={() =>
          canSave && mutate({ amountCents: reaisToCents(value!), where }, { onSuccess: onClose })
        }
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginTop: -space[8],
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.brand,
  },
  group: { gap: space[10] },
  label: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.dark.text.secondary,
  },
  chips: { gap: space[8] },
  error: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.dark.text.error,
  },
});
