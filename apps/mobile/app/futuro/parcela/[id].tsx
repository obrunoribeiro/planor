// Futuro · Detalhe da parcela — CONTEXTO.md §6.6. Node 31:519 no Figma.
//
// Anel de progresso, total, já pago, falta, próxima e última parcela, e a dica sobre quitar
// antecipado (texto fixo de produto, sem número calculado por IA — CLAUDE.md, princípio 2). Lê da
// mesma lista de `GET /future/installments` da tela de Parcelas. O lápis abre "Editar parcelamento"
// (nome, categoria, "Já quitei antecipado").
import {
  colors,
  Donut,
  EmptyState,
  gradients,
  Icon,
  primitives,
  radius,
  ScreenHeader,
  Skeleton,
  space,
  typography,
} from '@planor/ui';
import { monthNamePtBR } from '@planor/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money } from '@/components/Money';
import { ScreenGlow } from '@/components/ScreenGlow';
import { EditarParcelamentoSheet } from '@/features/parcelas/EditarParcelamentoSheet';
import { useInstallmentsQuery } from '@/lib/api/queries';
import { goBack } from '@/lib/navigation';

/** "2026-11-18" → "18 de novembro"; "2026-11" → "novembro de 2026". */
function dueLabel(due: string): string {
  if (due.length === 7) return `${monthNamePtBR(due)} de ${due.slice(0, 4)}`;
  return `${Number(due.slice(8, 10))} de ${monthNamePtBR(due.slice(0, 7))}`;
}

function ValueRow({
  label,
  children,
  last = false,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.valueRow, last ? null : styles.valueRowBorder]}>
      <Text style={styles.valueLabel}>{label}</Text>
      {children}
    </View>
  );
}

export default function ParcelaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, refetch } = useInstallmentsQuery();
  const [editVisible, setEditVisible] = useState(false);

  if (isPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="Parcelamento" onBack={() => goBack('/futuro/parcelas')} />
          <Skeleton shape="bloco" width="100%" />
          <Skeleton shape="bloco" width="100%" />
        </View>
      </View>
    );
  }

  const plan = data?.plans.find((p) => p.id === id);

  if (isError || !plan) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <EmptyState
          icon="aviso"
          title={isError ? 'Não deu pra carregar' : 'Parcelamento não encontrado'}
          text={
            isError
              ? 'Confira sua internet e tenta de novo.'
              : 'Ele pode ter terminado ou sido quitado.'
          }
          actionLabel={isError ? 'Tentar de novo' : 'Voltar'}
          onAction={() => (isError ? refetch() : goBack('/futuro/parcelas'))}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Parcelamento"
          onBack={() => goBack('/futuro/parcelas')}
          action={
            <Pressable
              style={styles.headerButton}
              onPress={() => setEditVisible(true)}
              accessibilityLabel="Editar parcelamento"
            >
              <Icon name="editar" size={20} color={colors.dark.text.primary} />
            </Pressable>
          }
        />

        <View style={styles.summary}>
          <View style={styles.ring}>
            <Donut
              size={150}
              strokeWidth={14}
              trackColor={colors.dark.bg.elevated}
              segments={[
                { percent: (plan.current / plan.count) * 100, color: primitives.purple[300] },
              ]}
            />
            <View style={styles.ringCenter} pointerEvents="none">
              <Text style={styles.ringValue}>
                {plan.current}/{plan.count}
              </Text>
              <Text style={styles.ringLabel}>parcelas</Text>
            </View>
          </View>
          <Text style={styles.name}>{plan.merchantName}</Text>
          <Text style={styles.subtitle}>
            {plan.settledEarly ? (
              `Quitado antecipadamente · ${plan.bank}`
            ) : (
              <>
                <Money cents={plan.installmentCents} style={styles.subtitle} /> por mês ·{' '}
                {plan.bank}
              </>
            )}
          </Text>
        </View>

        <View style={styles.timeline}>
          {Array.from({ length: plan.count }, (_, i) => (
            <View
              key={i}
              style={[styles.timelineStep, i < plan.current ? styles.timelineStepDone : null]}
            />
          ))}
        </View>

        <View style={styles.values}>
          <ValueRow label="Total da compra">
            <Money cents={plan.totalCents} style={styles.value} />
          </ValueRow>
          <ValueRow label="Já pago">
            <Money cents={plan.paidCents} style={[styles.value, styles.valueSuccess]} />
          </ValueRow>
          {/* Quitado antecipadamente: não tem mais "falta" nem "próxima". */}
          {!plan.settledEarly && (
            <>
              <ValueRow label="Falta pagar">
                <Money cents={plan.remainingCents} style={styles.value} />
              </ValueRow>
              <ValueRow label="Próxima parcela">
                <Text style={styles.value}>
                  {plan.nextDue ? dueLabel(plan.nextDue) : 'Esta é a última'}
                </Text>
              </ValueRow>
            </>
          )}
          <ValueRow label="Última parcela" last>
            <Text style={styles.value}>{dueLabel(plan.lastMonth)}</Text>
          </ValueRow>
        </View>

        {plan.remainingCents > 0 && !plan.settledEarly && (
          <LinearGradient
            colors={gradients.dicaIa.colors}
            start={gradients.dicaIa.start}
            end={gradients.dicaIa.end}
            style={styles.tip}
          >
            <Icon name="ia" size={20} color={colors.dark.text.brand} />
            <Text style={styles.tipText}>
              Se sobrar dinheiro, peça ao banco o valor para quitar antecipado. A antecipação
              costuma vir com desconto nos juros.
            </Text>
          </LinearGradient>
        )}
      </ScrollView>

      <EditarParcelamentoSheet
        plan={plan}
        visible={editVisible}
        onClose={() => setEditVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.surface,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
  },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[24] },
  content: {
    paddingTop: space[60],
    paddingHorizontal: space[24],
    paddingBottom: space[40],
    gap: space[20],
  },
  summary: { alignItems: 'center', gap: space[6], paddingTop: space[4] },
  ring: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringValue: {
    fontFamily: typography.numberLarge.fontFamily,
    fontSize: typography.numberLarge.fontSize,
    lineHeight: typography.numberLarge.lineHeight,
    letterSpacing: -0.24,
    color: colors.dark.text.primary,
  },
  ringLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.secondary,
  },
  name: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    lineHeight: typography.h2.lineHeight,
    letterSpacing: -0.22,
    color: colors.dark.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    lineHeight: typography.bodyMedium.lineHeight,
    color: colors.dark.text.secondary,
  },
  timeline: { flexDirection: 'row', justifyContent: 'center', gap: space[6], paddingTop: space[4] },
  timelineStep: {
    flex: 1,
    maxWidth: 26,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dark.bg.elevated,
  },
  timelineStepDone: { backgroundColor: primitives.purple[300] },
  values: {
    paddingHorizontal: space[20],
    paddingVertical: space[4],
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  valueRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.dark.border.default },
  valueLabel: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    lineHeight: typography.bodyMedium.lineHeight,
    color: colors.dark.text.secondary,
  },
  value: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  valueSuccess: { color: colors.dark.text.success },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[10],
    paddingHorizontal: space[16],
    paddingVertical: space[14],
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.4)',
  },
  tipText: {
    flex: 1,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.primary,
  },
});
