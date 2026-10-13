// Gastos · Criar limite — CONTEXTO.md §6.5 ("slider de R$ 100 a R$ 500, avisar em 80%, começar no
// mês que vem"). Node 46:934 no Figma. O limite vira uma meta do tipo `category_limit` (aparece em
// Metas) e gera os alertas `limit_80`/`limit_exceeded`.
import { formatCents, limitAlertCents, monthNamePtBR, purchasesWithinLimit } from '@planor/shared';
import { Button, colors, Slider, Sheet, space, Toggle, typography } from '@planor/ui';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Money } from '@/components/Money';
import { useCreateGoalMutation } from '@/lib/api/queries';
import { useMaskedMoneyText } from '@/lib/useMaskedMoneyText';

const MIN_CENTS = 10_000;
const MAX_CENTS = 50_000;
const STEP_CENTS = 1_000;

function nextMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number) as [number, number];
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
}

export type CriarLimiteSheetProps = {
  visible: boolean;
  onClose: () => void;
  categoryId: string;
  categoryName: string;
  /** Mês corrente, "YYYY-MM". */
  monthKey: string;
  spentThisMonthCents: number;
  monthlyAverageCents: number | null;
  averageTicketCents: number | null;
  /** Limite que já existe (ajustar em vez de criar). */
  current?: { targetCents: number; alertAtPct: number | null } | null;
  /** `current` é só o valor inicial (proposta da Planor IA), não um limite que já existe. */
  isNew?: boolean;
  onCreated?: () => void;
};

export function CriarLimiteSheet(props: CriarLimiteSheetProps) {
  const {
    visible,
    onClose,
    categoryId,
    categoryName,
    monthKey,
    spentThisMonthCents,
    monthlyAverageCents,
    averageTicketCents,
    current,
    isNew,
    onCreated,
  } = props;
  const mask = useMaskedMoneyText();
  const { mutate, isPending, isError } = useCreateGoalMutation();
  const [target, setTarget] = useState(30_000);
  const [alert80, setAlert80] = useState(true);
  const [startNext, setStartNext] = useState(false);

  useEffect(() => {
    if (!visible) return;
    // Começa pelo limite atual ou por 80% da média, dentro da faixa do slider.
    const suggested =
      current?.targetCents ??
      (monthlyAverageCents
        ? Math.round((monthlyAverageCents * 0.8) / STEP_CENTS) * STEP_CENTS
        : 30_000);
    const initial = Math.min(MAX_CENTS, Math.max(MIN_CENTS, suggested));
    setTarget(initial);
    setAlert80(current ? current.alertAtPct !== null : true);
    setStartNext(spentThisMonthCents > initial);
  }, [visible, current, monthlyAverageCents, spentThisMonthCents]);

  const purchases = purchasesWithinLimit(target, averageTicketCents);
  const thisMonth = monthNamePtBR(monthKey);
  const alreadyOver = spentThisMonthCents > target;

  return (
    <Sheet
      visible={visible}
      title={`Limite para ${categoryName}`}
      subtitle={
        monthlyAverageCents
          ? mask(`Sua média nos últimos 6 meses é ${formatCents(monthlyAverageCents)}`)
          : undefined
      }
      onClose={onClose}
    >
      <View style={styles.valueBlock}>
        <Money cents={target} style={styles.value} />
        <Text style={styles.valueCaption}>
          por mês
          {purchases ? ` · cerca de ${purchases} ${purchases === 1 ? 'compra' : 'compras'}` : ''}
        </Text>
      </View>
      <View style={styles.sliderBlock}>
        <Slider
          value={target}
          min={MIN_CENTS}
          max={MAX_CENTS}
          step={STEP_CENTS}
          onValueChange={setTarget}
          accessibilityLabel="Valor do limite por mês"
        />
        <View style={styles.range}>
          <Text style={styles.rangeLabel}>R$ 100</Text>
          <Text style={styles.rangeLabel}>R$ 500</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.texts}>
          <Text style={styles.title}>Avisar quando chegar a 80%</Text>
          <Text style={styles.subtitle}>
            {mask(`Te aviso ao passar de ${formatCents(limitAlertCents(target, 0.8))}`)}
          </Text>
        </View>
        <Toggle
          value={alert80}
          onValueChange={setAlert80}
          accessibilityLabel="Avisar quando chegar a 80%"
        />
      </View>
      <View style={styles.row}>
        <View style={styles.texts}>
          <Text style={styles.title}>
            Contar a partir de {monthNamePtBR(nextMonthKey(monthKey))}
          </Text>
          <Text style={styles.subtitle}>
            {alreadyOver
              ? `${capitalize(thisMonth)} já passou do limite`
              : `Desligado, já conta em ${thisMonth}`}
          </Text>
        </View>
        <Toggle
          value={startNext}
          onValueChange={setStartNext}
          accessibilityLabel={`Contar a partir de ${monthNamePtBR(nextMonthKey(monthKey))}`}
        />
      </View>
      {isError && (
        <Text style={styles.error}>Não deu pra salvar agora. Tenta de novo em instantes.</Text>
      )}
      <Button
        label={current && !isNew ? 'Salvar limite' : 'Criar limite'}
        loading={isPending}
        onPress={() =>
          mutate(
            {
              type: 'category_limit',
              categoryId,
              targetCents: target,
              alertAt80: alert80,
              startNextMonth: startNext,
            },
            {
              onSuccess: () => {
                onClose();
                onCreated?.();
              },
            },
          )
        }
      />
    </Sheet>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const styles = StyleSheet.create({
  valueBlock: { alignItems: 'center', gap: space[4] },
  value: {
    fontFamily: typography.numberXl.fontFamily,
    fontSize: typography.numberXl.fontSize,
    lineHeight: typography.numberXl.lineHeight,
    letterSpacing: -0.72,
    color: colors.dark.text.primary,
  },
  valueCaption: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.secondary,
  },
  sliderBlock: { gap: space[8] },
  range: { flexDirection: 'row', justifyContent: 'space-between' },
  rangeLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[8] },
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
