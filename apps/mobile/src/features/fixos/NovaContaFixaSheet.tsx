// Futuro · Adicionar conta fixa — CONTEXTO.md §6.6 ("Nova conta fixa" manual: nome, valor, dia e
// pago com). Node 48:1111 no Figma.
import { reaisToCents } from '@planor/shared';
import { Button, Chip, colors, Sheet, space, TextField, typography } from '@planor/ui';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAccountsQuery, useCreateFixedBillMutation } from '@/lib/api/queries';
import { parseReaisInput } from '@/lib/format';

const ACCOUNT_LABEL = { checking: 'Conta corrente', savings: 'Poupança', credit_card: 'Cartão de crédito' } as const;

export type NovaContaFixaSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function NovaContaFixaSheet({ visible, onClose }: NovaContaFixaSheetProps) {
  const { data: accounts } = useAccountsQuery();
  const { mutate: create, isPending, isError } = useCreateFixedBillMutation();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [paidWith, setPaidWith] = useState<string | null>(null);

  // "Pago com" = os tipos de conta que o usuário tem (sem repetir).
  const paidWithOptions = [...new Set((accounts ?? []).map((a) => ACCOUNT_LABEL[a.type]))];

  const amountValue = parseReaisInput(amount);
  const dayValue = Number(day);
  const dayValid = Number.isInteger(dayValue) && dayValue >= 1 && dayValue <= 31;
  const canSave = name.trim().length > 0 && amountValue !== null && amountValue > 0 && dayValid;

  const close = () => {
    setName('');
    setAmount('');
    setDay('');
    setPaidWith(null);
    onClose();
  };

  const save = () => {
    if (!canSave) return;
    create({ name: name.trim(), amountCents: reaisToCents(amountValue!), day: dayValue, paidWith }, { onSuccess: close });
  };

  return (
    <Sheet visible={visible} title="Nova conta fixa" onClose={close}>
      <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Academia (débito)" autoCapitalize="sentences" />
      <View style={styles.row}>
        <View style={styles.half}>
          <TextField label="Valor" value={amount} onChangeText={setAmount} placeholder="59,90" keyboardType="decimal-pad" />
        </View>
        <View style={styles.half}>
          <TextField
            label="Dia do mês"
            value={day}
            onChangeText={setDay}
            placeholder="10"
            keyboardType="number-pad"
            error={day && !dayValid ? 'De 1 a 31' : undefined}
          />
        </View>
      </View>
      {paidWithOptions.length > 0 && (
        <View style={styles.paidWith}>
          <Text style={styles.label}>Pago com</Text>
          <View style={styles.chips}>
            {paidWithOptions.map((option) => (
              <Chip key={option} label={option} active={paidWith === option} onPress={() => setPaidWith(paidWith === option ? null : option)} />
            ))}
          </View>
        </View>
      )}
      {isError && <Text style={styles.error}>Não deu pra salvar agora. Tenta de novo em instantes.</Text>}
      <Button label="Adicionar" onPress={save} disabled={!canSave} loading={isPending} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[12] },
  half: { flex: 1 },
  paidWith: { gap: space[8] },
  label: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.dark.text.secondary,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  error: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.dark.text.error,
  },
});
