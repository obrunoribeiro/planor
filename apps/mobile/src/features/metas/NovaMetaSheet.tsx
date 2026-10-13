// Nova meta / Editar meta — CONTEXTO.md §6.8 ("nome, valor e prazo, com a conta 'Dá R$ 333,33 por
// mês. Cabe no seu orçamento?'"). Node 51:1322 no Figma. Editando, também tem "Excluir".
import {
  addMonthsToKey,
  dayInMonthKey,
  formatCents,
  paceCents,
  reaisToCents,
} from '@planor/shared';
import {
  Button,
  Chip,
  colors,
  gradients,
  Icon,
  radius,
  Sheet,
  space,
  TextField,
  typography,
} from '@planor/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  useCreateGoalMutation,
  useLeftoverForecastQuery,
  useUpdateGoalMutation,
} from '@/lib/api/queries';
import type { GoalItem } from '@/lib/api/types';
import { parseReaisInput } from '@/lib/format';
import { useMaskedMoneyText } from '@/lib/useMaskedMoneyText';

const DEADLINES = [6, 12, 18] as const;

function todayKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function deadlineIn(months: number): string {
  const today = todayKey();
  return dayInMonthKey(addMonthsToKey(today.slice(0, 7), months), Number(today.slice(8, 10)));
}

function centsToInput(cents: number): string {
  return formatCents(cents)
    .replace(/^R\$\s?/, '')
    .replace(/\u00a0/g, '');
}

export type NovaMetaSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Editando uma meta existente. */
  goal?: GoalItem;
  /** Valores iniciais de uma meta nova (proposta da Planor IA). */
  initial?: { name: string; targetCents: number; months: number | null };
  /** Depois de criar (a proposta do chat mostra "Meta criada"). */
  onCreated?: () => void;
  /** "Excluir" — a tela fecha o sheet e confirma com um diálogo (Modal dentro de Modal não abre no iOS). */
  onRequestDelete?: () => void;
};

export function NovaMetaSheet({
  visible,
  onClose,
  goal,
  initial,
  onCreated,
  onRequestDelete,
}: NovaMetaSheetProps) {
  const mask = useMaskedMoneyText();
  const { data: forecast } = useLeftoverForecastQuery();
  const create = useCreateGoalMutation();
  const update = useUpdateGoalMutation(goal?.id ?? '');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [months, setMonths] = useState<number | null>(12);

  useEffect(() => {
    if (!visible) return;
    setName(goal?.name ?? initial?.name ?? '');
    setAmount(
      goal ? centsToInput(goal.targetCents) : initial ? centsToInput(initial.targetCents) : '',
    );
    // Editando, o prazo continua o que estava, a não ser que escolha outro.
    setMonths(goal ? null : initial ? initial.months : 12);
  }, [visible, goal, initial]);

  const amountValue = parseReaisInput(amount);
  const targetCents = amountValue && amountValue > 0 ? reaisToCents(amountValue) : null;
  const isLimit = goal?.type === 'category_limit';
  const canSave = (isLimit || name.trim().length > 0) && targetCents !== null;

  const perMonth =
    targetCents && months
      ? paceCents({ targetCents, savedCents: goal?.currentCents ?? 0, periods: months })
      : null;
  const leftover = forecast?.projectedLeftoverCents ?? null;
  const tip =
    perMonth === null
      ? null
      : leftover === null
        ? `Dá ${formatCents(perMonth)} por mês.`
        : perMonth <= leftover
          ? `Dá ${formatCents(perMonth)} por mês. Hoje sobram ${formatCents(leftover)}, então cabe no seu orçamento.`
          : `Dá ${formatCents(perMonth)} por mês. Hoje sobram ${formatCents(leftover)}: fica apertado, um prazo maior ajuda.`;

  const saving = create.isPending || update.isPending;
  const failed = create.isError || update.isError;

  const save = () => {
    if (!canSave || !targetCents) return;
    if (goal) {
      update.mutate(
        {
          ...(isLimit ? {} : { name: name.trim() }),
          targetCents,
          ...(months ? { deadline: deadlineIn(months) } : {}),
        },
        { onSuccess: onClose },
      );
    } else {
      create.mutate(
        {
          type: 'savings',
          name: name.trim(),
          targetCents,
          deadline: months ? deadlineIn(months) : null,
        },
        {
          onSuccess: () => {
            onClose();
            onCreated?.();
          },
        },
      );
    }
  };

  return (
    <Sheet
      visible={visible}
      title={goal ? (isLimit ? 'Editar limite' : 'Editar meta') : 'Nova meta'}
      onClose={onClose}
    >
      {!isLimit && (
        <TextField
          label="Nome"
          value={name}
          onChangeText={setName}
          placeholder="Ex.: Trocar o notebook"
          autoCapitalize="sentences"
        />
      )}
      <TextField
        label={isLimit ? 'Limite por mês' : 'Quanto'}
        value={amount}
        onChangeText={setAmount}
        placeholder="4.000,00"
        keyboardType="decimal-pad"
      />
      {!isLimit && (
        <View style={styles.group}>
          <Text style={styles.label}>Prazo</Text>
          <View style={styles.chips}>
            {DEADLINES.map((m) => (
              <Chip
                key={m}
                label={`${m} meses`}
                active={months === m}
                onPress={() => setMonths(months === m ? null : m)}
              />
            ))}
          </View>
        </View>
      )}
      {tip && (
        <LinearGradient
          colors={gradients.dicaIa.colors}
          start={gradients.dicaIa.start}
          end={gradients.dicaIa.end}
          style={styles.tip}
        >
          <Icon name="estrela" size={18} color={colors.dark.text.brand} />
          <Text style={styles.tipText}>{mask(tip)}</Text>
        </LinearGradient>
      )}
      {failed && (
        <Text style={styles.error}>Não deu pra salvar agora. Tenta de novo em instantes.</Text>
      )}
      <Button
        label={goal ? 'Salvar' : 'Criar meta'}
        onPress={save}
        disabled={!canSave}
        loading={saving}
      />
      {goal && (
        <Pressable onPress={onRequestDelete} style={styles.delete} accessibilityRole="button">
          <Text style={styles.deleteLabel}>{isLimit ? 'Excluir limite' : 'Excluir meta'}</Text>
        </Pressable>
      )}
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
  chips: { flexDirection: 'row', gap: space[8] },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[12],
    padding: space[14],
    borderRadius: radius['2xl'],
  },
  tipText: {
    flex: 1,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.primary,
  },
  error: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.dark.text.error,
  },
  delete: { alignSelf: 'center', paddingVertical: space[8] },
  deleteLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.error,
  },
});
