// "Para onde vai seu dinheiro" — grade de 4 cards. CONTEXTO.md §6.4. Node 25:246 no Figma.
import { Avatar, Badge, colors, Gauge, primitives, space, Sparkline, typography, useRevealProgress } from '@planor/ui';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Money } from '@/components/Money';
import { monthNamePtBR, monthYearShortLabel } from '@/lib/format';
import type { HomeResponse } from '@/lib/api/types';

// Largura "de design" dos gráficos (Sparkline/Gauge) nesses cards. Em telas estreitas o card de
// 47% de largura fica menor que isso — medimos o espaço real via onLayout e encolhemos o gráfico
// pra caber, pra nunca cortar a ponta do traço (CONTEXTO.md §4: "Desenhe com react-native-svg").
const CARD_PADDING = space[16];

function CardFrame({ children }: { children: (contentWidth: number) => ReactNode }) {
  const [contentWidth, setContentWidth] = useState(132);

  const onLayout = (event: LayoutChangeEvent) => {
    setContentWidth(event.nativeEvent.layout.width - CARD_PADDING * 2);
  };

  return (
    <View style={styles.card} onLayout={onLayout}>
      {children(contentWidth)}
    </View>
  );
}

function GastoDoMesCard({ spendingThisMonth, monthLabel }: { spendingThisMonth: HomeResponse['spendingThisMonth']; monthLabel: string }) {
  return (
    <CardFrame>
      {(contentWidth) => (
        <>
          {spendingThisMonth.sparkline.length >= 2 ? (
            <Sparkline values={[...spendingThisMonth.sparkline]} width={Math.min(137, contentWidth)} height={64} />
          ) : (
            <View style={{ height: 64 }} />
          )}
          <View style={styles.values}>
            <Text style={styles.label}>Gasto em {monthLabel}</Text>
            <Money style={styles.amount} cents={spendingThisMonth.amountCents} />
            {spendingThisMonth.trendVsLastMonthPct !== null && (
              // Gastar mais que o mês anterior é ruim (vermelho); menos, bom (verde).
              <Text style={spendingThisMonth.trendVsLastMonthPct > 0 ? styles.trendNegative : styles.trendPositive}>
                {spendingThisMonth.trendVsLastMonthPct > 0 ? '+' : ''}
                {spendingThisMonth.trendVsLastMonthPct}% que o mês anterior
              </Text>
            )}
          </View>
        </>
      )}
    </CardFrame>
  );
}

function AssinaturasCard({ subscriptions }: { subscriptions: HomeResponse['subscriptions'] }) {
  const colorByToken = { purple800: primitives.purple[800], alert800: primitives.alert[800] };

  return (
    <CardFrame>
      {() => (
        <>
          <View style={styles.subscriptionsTop}>
            <View style={styles.avatarStack}>
              {subscriptions.avatars.map((avatar, index) => (
                <View key={avatar.initials} style={[styles.avatarStackItem, index > 0 ? styles.avatarStackOverlap : null]}>
                  <Avatar
                    initials={avatar.initials}
                    size={30}
                    variant="solid"
                    color={colorByToken[avatar.colorToken]}
                    borderColor={colors.dark.bg.surface}
                  />
                </View>
              ))}
              {subscriptions.count > subscriptions.avatars.length && (
                <View style={[styles.avatarStackItem, styles.avatarStackOverlap]}>
                  <Avatar
                    initials={`+${subscriptions.count - subscriptions.avatars.length}`}
                    size={30}
                    variant="solid"
                    color={primitives.success[800]}
                    borderColor={colors.dark.bg.surface}
                  />
                </View>
              )}
            </View>
            <Badge tone="alert" label={`${subscriptions.unusedCount} sem uso`} />
          </View>
          <View style={styles.values}>
            <Text style={styles.label}>{subscriptions.count} assinaturas</Text>
            <Money style={styles.amount} suffixStyle={styles.amountSuffix} cents={subscriptions.monthlyCents} suffix="/mês" />
            <Text style={styles.hint}>
              <Money style={styles.hint} cents={subscriptions.yearlyCents} /> por ano
            </Text>
          </View>
        </>
      )}
    </CardFrame>
  );
}

function InstallmentRowFill({ percent }: { percent: number }) {
  const { progress, ref } = useRevealProgress(percent);
  const style = useAnimatedStyle(() => ({ width: `${progress.value}%` }));
  return <Animated.View ref={ref} collapsable={false} style={[styles.installmentFill, style]} />;
}

function ParcelamentosCard({ installments }: { installments: HomeResponse['installments'] }) {
  return (
    <CardFrame>
      {() => (
        <>
          <View style={styles.installmentRows}>
            {installments.progress.map((row) => (
              <View key={row.label} style={styles.installmentRow}>
                <Text style={styles.installmentLabel}>{row.label}</Text>
                <View style={styles.installmentTrack}>
                  <InstallmentRowFill percent={row.percent} />
                </View>
              </View>
            ))}
          </View>
          <View style={styles.values}>
            <Text style={styles.label}>{installments.count} parcelamentos</Text>
            <Money style={styles.amount} suffixStyle={styles.amountSuffix} cents={installments.monthlyCents} suffix="/mês" />
            {installments.lastInstallmentDate && (
              <Text style={styles.hint}>Última parcela em {monthYearShortLabel(installments.lastInstallmentDate)}</Text>
            )}
          </View>
        </>
      )}
    </CardFrame>
  );
}

function FixosVariaveisCard({ fixedVsVariable }: { fixedVsVariable: HomeResponse['fixedVsVariable'] }) {
  return (
    <CardFrame>
      {(contentWidth) => (
        <>
          <View style={styles.gaugeWrap}>
            <Gauge percent={fixedVsVariable.fixedPct} size={Math.min(132, contentWidth)} />
            <Text style={styles.gaugeValue}>{fixedVsVariable.fixedPct}%</Text>
          </View>
          <View style={styles.values}>
            <Text style={styles.label}>Gastos fixos</Text>
            <Text style={styles.miniRow}>
              Fixos <Money style={styles.miniRowValue} cents={fixedVsVariable.fixedCents} />
            </Text>
            <Text style={styles.miniRow}>
              Variáveis <Money style={styles.miniRowValue} cents={fixedVsVariable.variableCents} />
            </Text>
          </View>
        </>
      )}
    </CardFrame>
  );
}

export type ParaOndeVaiSeuDinheiroProps = {
  month: string;
  spendingThisMonth: HomeResponse['spendingThisMonth'];
  subscriptions: HomeResponse['subscriptions'];
  installments: HomeResponse['installments'];
  fixedVsVariable: HomeResponse['fixedVsVariable'];
};

export function ParaOndeVaiSeuDinheiro({
  month,
  spendingThisMonth,
  subscriptions,
  installments,
  fixedVsVariable,
}: ParaOndeVaiSeuDinheiroProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Para onde vai seu dinheiro</Text>
      <View style={styles.grid}>
        <GastoDoMesCard spendingThisMonth={spendingThisMonth} monthLabel={monthNamePtBR(month)} />
        <AssinaturasCard subscriptions={subscriptions} />
        <ParcelamentosCard installments={installments} />
        <FixosVariaveisCard fixedVsVariable={fixedVsVariable} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space[14],
  },
  sectionTitle: {
    fontFamily: typography.h2.fontFamily,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.2,
    color: colors.dark.text.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[12],
  },
  card: {
    width: '47%',
    height: 190,
    justifyContent: 'space-between',
    padding: space[16],
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  values: {
    gap: space[2],
  },
  label: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: 18,
    color: colors.dark.text.secondary,
  },
  amount: {
    fontFamily: typography.numberLarge.fontFamily,
    fontSize: 18,
    lineHeight: 32,
    letterSpacing: -0.18,
    color: colors.dark.text.primary,
  },
  amountSuffix: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 13,
    color: colors.dark.text.tertiary,
  },
  trendPositive: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.success,
  },
  trendNegative: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.error,
  },
  hint: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  subscriptionsTop: {
    gap: space[10],
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatarStackItem: {
    zIndex: 1,
  },
  avatarStackOverlap: {
    marginLeft: -8,
  },
  installmentRows: {
    gap: space[8],
    paddingTop: space[4],
  },
  installmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
  },
  installmentLabel: {
    width: 36,
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  installmentTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.dark.border.default,
    overflow: 'hidden',
  },
  installmentFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: primitives.purple[400],
  },
  gaugeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeValue: {
    position: 'absolute',
    fontFamily: typography.numberLarge.fontFamily,
    fontSize: 22,
    color: colors.dark.text.primary,
  },
  miniRow: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.secondary,
  },
  miniRowValue: {
    fontFamily: typography.labelSmall.fontFamily,
    color: colors.dark.text.primary,
  },
});
