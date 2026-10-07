// Futuro · Linha do tempo — CONTEXTO.md §6.6. Node 30:459 no Figma.
import { formatCents } from '@planor/shared';
import { Badge, Chip, colors, EmptyState, gradients, GlowOrb, Icon, RevealScrollView, Skeleton, space, typography, useRevealProgress, type IconName } from '@planor/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { capitalize, dueDayMonthLabel } from '@/lib/format';
import { useFutureTimelineQuery } from '@/lib/api/queries';

const FILTERS = ['Tudo', 'Parcelas', 'Assinaturas', 'Fixos'] as const;

const MAX_BAR_HEIGHT = 96;

function CommittedBar({ height, active }: { height: number; active: boolean }) {
  const { progress, ref } = useRevealProgress(height);
  const style = useAnimatedStyle(() => ({ height: progress.value }));

  if (active) {
    return (
      <Animated.View ref={ref} collapsable={false} style={[styles.bar, styles.barClip, style]}>
        <LinearGradient colors={gradients.progresso.colors} start={gradients.progresso.start} end={gradients.progresso.end} style={StyleSheet.absoluteFill} />
      </Animated.View>
    );
  }
  return <Animated.View ref={ref} collapsable={false} style={[styles.bar, styles.barInactive, style]} />;
}

function CommittedRow({
  icon,
  title,
  subtitle,
  amountCents,
  last = false,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  amountCents: number;
  last?: boolean;
}) {
  // TODO: navegar pra /futuro/parcelas, /futuro/assinaturas ou /futuro/fixos quando existirem.
  return (
    <Pressable style={[styles.row, last ? styles.rowNoBorder : null]}>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={18} color="#C8C6FE" />
      </View>
      <View style={styles.rowTexts}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.rowAmount}>{formatCents(amountCents)}</Text>
      <Icon name="seta-direita" size={16} color={colors.dark.text.tertiary} />
    </Pressable>
  );
}

export default function FuturoScreen() {
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>('Tudo');
  const { data, isPending, isError, refetch } = useFutureTimelineQuery();

  const glowOrb = (
    <View style={styles.glow} pointerEvents="none">
      <GlowOrb
        width={630}
        height={480}
        color="#7C5CFF"
        stops={[
          { offset: 0, opacity: 0.35 },
          { offset: 0.55, opacity: 0.1225 },
          { offset: 1, opacity: 0 },
        ]}
      />
    </View>
  );

  if (isPending) {
    return (
      <View style={styles.screen}>
        {glowOrb}
        <View style={styles.skeletonScreen}>
          <Skeleton shape="bloco" width="100%" />
          <Skeleton shape="bloco" width="100%" />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <EmptyState
          icon="aviso"
          title="Não deu pra carregar"
          text="Confira sua internet e tenta de novo."
          actionLabel="Tentar de novo"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  const { committed, currentMonth, statements } = data;
  const maxAmount = Math.max(1, ...committed.months.map((m) => m.amountCents));

  return (
    <View style={styles.screen}>
      {glowOrb}

      <RevealScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={styles.pageTitle}>Futuro</Text>
          {/* TODO: abrir o sheet "Filtrar compromissos" quando existir. */}
          <Pressable style={styles.iconButton} accessibilityLabel="Filtros">
            <Icon name="filtro" size={20} color={colors.dark.text.primary} />
          </Pressable>
        </View>

        <View style={styles.filters}>
          {FILTERS.map((filter) => (
            <Chip key={filter} label={filter} active={filter === activeFilter} onPress={() => setActiveFilter(filter)} />
          ))}
        </View>

        {committed.months.length === 0 ? (
          <EmptyState icon="futuro" title="Nada comprometido ainda" text="Parcelas, assinaturas e fixos que você registrar aparecem aqui." />
        ) : (
          <LinearGradient
            colors={gradients.totalGastos.colors}
            locations={gradients.totalGastos.locations}
            start={gradients.totalGastos.start}
            end={gradients.totalGastos.end}
            style={styles.committedCard}
          >
            <View style={styles.committedHeader}>
              <Text style={styles.committedLabel}>Já comprometido até {committed.untilLabel}</Text>
              <Text style={styles.committedAmount}>{formatCents(committed.totalCents)}</Text>
              <Text style={styles.committedHint}>Parcelas, assinaturas e gastos fixos que já vão cair na fatura.</Text>
            </View>

            <View style={styles.bars}>
              {committed.months.map((month) => {
                const barHeight = Math.max(8, (month.amountCents / maxAmount) * MAX_BAR_HEIGHT);
                return (
                  <View key={month.label} style={styles.barColumn}>
                    <CommittedBar height={barHeight} active={month.active} />
                    <Text style={[styles.barLabel, month.active ? styles.barLabelActive : null]}>{month.label}</Text>
                  </View>
                );
              })}
            </View>
          </LinearGradient>
        )}

        {currentMonth && (
          <>
            <View style={styles.monthHeader}>
              <Text style={styles.monthTitle}>{capitalize(currentMonth.label)}</Text>
              <Text style={styles.monthAmount}>{formatCents(currentMonth.totalCents)}</Text>
            </View>

            <View style={styles.monthCard}>
              <CommittedRow
                icon="parcelas"
                title="Parcelas"
                subtitle={`${currentMonth.installments.count} parcelamentos`}
                amountCents={currentMonth.installments.amountCents}
              />
              <CommittedRow
                icon="play"
                title="Assinaturas"
                subtitle={`${currentMonth.subscriptions.count} assinaturas`}
                amountCents={currentMonth.subscriptions.amountCents}
              />
              <CommittedRow
                icon="repetir"
                title="Fixos recorrentes"
                subtitle={currentMonth.bills.description}
                amountCents={currentMonth.bills.amountCents}
                last
              />
            </View>
          </>
        )}

        {statements.length > 0 && (
          <View style={styles.statements}>
            {statements.map((statement) => (
              // TODO: navegar pra /futuro/fatura/[cardId] quando essa tela existir.
              <Pressable key={statement.bank} style={styles.statementCard}>
                <Text style={styles.statementLabel}>Fatura {statement.bank}</Text>
                <Text style={styles.statementAmount}>{formatCents(statement.amountCents)}</Text>
                <Text style={styles.statementDue}>{dueDayMonthLabel(statement.dueDate)}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.simulatorCard}>
          <LinearGradient
            colors={gradients.icone.colors}
            start={gradients.icone.start}
            end={gradients.icone.end}
            style={styles.simulatorIcon}
          >
            <Icon name="sacola" size={20} color={colors.dark.text.primary} />
          </LinearGradient>
          <View style={styles.simulatorTexts}>
            <Text style={styles.simulatorTitle}>Posso comprar?</Text>
            <Text style={styles.simulatorSubtitle}>Simule uma compra parcelada e veja o impacto nos próximos meses.</Text>
          </View>
          <Badge tone="alert" label="Em breve" />
        </View>
      </RevealScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  glow: { position: 'absolute', top: -160, left: -120 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[24] },
  skeletonScreen: { flex: 1, paddingTop: space[60], paddingHorizontal: space[24], gap: space[20] },
  content: {
    paddingTop: space[60],
    paddingHorizontal: space[24],
    paddingBottom: 132,
    gap: space[20],
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  pageTitle: {
    flex: 1,
    fontFamily: typography.h1.fontFamily,
    fontSize: typography.h1.fontSize,
    lineHeight: typography.h1.lineHeight,
    letterSpacing: typography.h1.letterSpacing,
    color: colors.dark.text.primary,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.surface,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
  },
  filters: { flexDirection: 'row', gap: space[4] },
  committedCard: {
    gap: space[16],
    padding: space[20],
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(200, 198, 254, 0.2)',
  },
  committedHeader: { gap: space[4] },
  committedLabel: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    color: colors.dark.text.secondary,
  },
  committedAmount: {
    fontFamily: typography.numberXl.fontFamily,
    fontSize: typography.numberXl.fontSize,
    lineHeight: typography.numberXl.lineHeight,
    letterSpacing: typography.numberXl.letterSpacing,
    color: colors.dark.text.primary,
  },
  committedHint: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: space[10] },
  barColumn: { flex: 1, alignItems: 'center', gap: space[6] },
  bar: { width: '100%', borderRadius: 8 },
  barClip: { overflow: 'hidden' },
  barInactive: { backgroundColor: 'rgba(58, 47, 122, 0.8)' },
  barLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  barLabelActive: { color: colors.dark.text.primary },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitle: {
    fontFamily: typography.h2.fontFamily,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.2,
    color: colors.dark.text.primary,
  },
  monthAmount: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    lineHeight: typography.labelLarge.lineHeight,
    color: colors.dark.text.primary,
  },
  monthCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
    paddingHorizontal: space[20],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    height: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border.default,
  },
  rowNoBorder: {
    borderBottomWidth: 0,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 92, 255, 0.18)',
  },
  rowTexts: { flex: 1, gap: space[2] },
  rowTitle: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  rowSubtitle: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  rowAmount: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    color: colors.dark.text.primary,
  },
  statements: { flexDirection: 'row', gap: space[12] },
  statementCard: {
    flex: 1,
    gap: space[6],
    padding: space[16],
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  statementLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.secondary,
  },
  statementAmount: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    lineHeight: typography.labelLarge.lineHeight,
    color: colors.dark.text.primary,
  },
  statementDue: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  simulatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    padding: space[16],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.5)',
    backgroundColor: 'rgba(80, 63, 170, 0.18)',
  },
  simulatorIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulatorTexts: { flex: 1, gap: space[2] },
  simulatorTitle: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    lineHeight: typography.labelLarge.lineHeight,
    color: colors.dark.text.primary,
  },
  simulatorSubtitle: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.secondary,
  },
});
