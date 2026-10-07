// "Editar perfil" — CONTEXTO.md §6.10: "nome, renda mensal (usada na sobra) e dia em que
// recebe." Salva de verdade via PATCH /me (apps/api/src/routes/me.ts já valida com zod).
import { Button, Sheet, TextField, colors, space, typography } from '@planor/ui';
import { reaisToCents } from '@planor/shared';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useUpdateMeMutation } from '@/lib/api/queries';
import type { MeResponse } from '@/lib/api/types';

export type EditarPerfilSheetProps = {
  visible: boolean;
  onClose: () => void;
  me: MeResponse;
};

function centsToReaisInput(cents: number | null): string {
  if (cents === null) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

/** "6.500,00" ou "6500,5" → 6500.5. `null` se não for um número válido. */
function parseReaisInput(text: string): number | null {
  const normalized = text.replace(/\./g, '').replace(',', '.').trim();
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function EditarPerfilSheet({ visible, onClose, me }: EditarPerfilSheetProps) {
  const [name, setName] = useState(me.name ?? '');
  const [incomeText, setIncomeText] = useState(centsToReaisInput(me.monthlyIncomeCents));
  const [paydayText, setPaydayText] = useState(me.payday ? String(me.payday) : '');
  const [error, setError] = useState<string | undefined>();
  const { mutate, isPending } = useUpdateMeMutation();

  // Toda vez que a sheet abre de novo, volta pros valores atuais do servidor — sem isso, fechar
  // sem salvar e abrir de novo mostraria o que foi digitado da última vez.
  useEffect(() => {
    if (visible) {
      setName(me.name ?? '');
      setIncomeText(centsToReaisInput(me.monthlyIncomeCents));
      setPaydayText(me.payday ? String(me.payday) : '');
      setError(undefined);
    }
  }, [visible, me]);

  const onSave = () => {
    if (!name.trim()) {
      setError('Digite seu nome.');
      return;
    }
    const income = incomeText.trim() ? parseReaisInput(incomeText) : null;
    if (incomeText.trim() && income === null) {
      setError('Renda inválida — digite só números, ex.: 6500,00.');
      return;
    }
    const payday = paydayText.trim() ? Number(paydayText) : null;
    if (paydayText.trim() && (!Number.isInteger(payday) || payday! < 1 || payday! > 31)) {
      setError('O dia precisa ser entre 1 e 31.');
      return;
    }

    setError(undefined);
    mutate(
      {
        name: name.trim(),
        ...(income !== null ? { monthlyIncomeCents: reaisToCents(income) } : {}),
        ...(payday !== null ? { payday } : {}),
      },
      {
        onSuccess: onClose,
        onError: () => setError('Não deu pra salvar — confira sua internet e tenta de novo.'),
      },
    );
  };

  return (
    <Sheet visible={visible} title="Editar perfil" onClose={onClose}>
      <View style={styles.form}>
        <TextField label="Nome" value={name} onChangeText={setName} autoCapitalize="words" />
        <TextField
          label="Renda mensal"
          value={incomeText}
          onChangeText={setIncomeText}
          keyboardType="decimal-pad"
          placeholder="6500,00"
        />
        <TextField
          label="Dia em que recebe"
          value={paydayText}
          onChangeText={setPaydayText}
          keyboardType="number-pad"
          placeholder="5"
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <Button label="Salvar" onPress={onSave} loading={isPending} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: space[16],
  },
  error: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.error,
  },
});
