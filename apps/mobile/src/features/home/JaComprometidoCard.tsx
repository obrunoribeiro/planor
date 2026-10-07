// "Já comprometido" — CONTEXTO.md §6.4 e §6.6. Node 25:197 no Figma.
import { colors, gradients, Icon, radius, space, typography, useRevealProgress } from '@planor/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Money } from '@/components/Money';
import { useHiddenValuesStore } from '@/lib/stores/useHiddenValuesStore';
import type { HomeResponse } from '@/lib/api/types';

const MAX_BAR_HEIGHT = 84;

function Bar({ height, active }: { height: number; active: boolean }) {
  const { progress, ref } = useRevealProgress(height);
  const style = useAnimatedStyle(() => ({ height: progress.value }));

  if (active) {
    return (
      <Animated.View ref={ref} collapsable={false} style={[styles.bar, styles.barClip, style]}>
        <LinearGradient
          colors={gradients.icone.colors}
          start={gradients.icone.start}
          end={gradients.icone.end}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    );
  }
  return <Animated.View ref={ref} collapsable={false} style={[styles.bar, styles.barInactive, style]} />;
}

export type JaComprometidoCardProps = {
  committed: NonNullable<HomeResponse['committed']>;
};

export function JaComprometidoCard({ committed }: JaComprometidoCardProps) {
  const hidden = useHiddenValuesStore((state) => state.hidden);
  const maxAmount = Math.max(...committed.months.map((m) => m.amountCents));

  return (
    <LinearGradient
      colors={gradients.jaComprometido.colors}
      locations={gradients.jaComprometido.locations}
      start={gradients.jaComprometido.start}
      end={gradients.jaComprometido.end}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>JÁ COMPROMETIDO</Text>
        <Text style={styles.title}>
          {committed.nextMonthLabel} já tem <Money style={styles.titleHighlight} cents={committed.nextMonthAmountCents} /> em
          parcelas e assinaturas
        </Text>
      </View>

      <View style={styles.bars}>
        {committed.months.map((month, index) => {
          const barHeight = Math.max(8, (month.amountCents / maxAmount) * MAX_BAR_HEIGHT);
          const isActive = index === 0;
          return (
            <View key={month.label} style={styles.barColumn}>
              <Text style={[styles.barValue, isActive ? styles.barValueActive : null]}>
                {hidden ? '•••' : Math.round(month.amountCents / 1000).toLocaleString('pt-BR')}
              </Text>
              <Bar height={barHeight} active={isActive} />
              <Text style={[styles.barLabel, isActive ? styles.barLabelActive : null]}>{month.label}</Text>
            </View>
          );
        })}
      </View>

      {/* TODO: navegar pra /futuro quando a linha do tempo existir (próxima tela da Fase 1). */}
      <Pressable style={styles.link}>
        <Text style={styles.linkLabel}>Ver linha do tempo das faturas</Text>
        <Icon name="seta-direita" size={18} color={colors.dark.text.brand} />
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space[16],
    padding: space[20],
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: colors.dark.border.default,
  },
  header: {
    gap: space[4],
  },
  eyebrow: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.brand,
  },
  title: {
    fontFamily: typography.h3.fontFamily,
    fontSize: typography.h3.fontSize,
    lineHeight: typography.h3.lineHeight,
    letterSpacing: typography.h3.letterSpacing,
    color: colors.dark.text.primary,
  },
  titleHighlight: {
    color: '#C8C6FE',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[12],
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: space[6],
  },
  barValue: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  barValueActive: {
    color: colors.dark.text.secondary,
  },
  bar: {
    width: '100%',
    borderRadius: 10,
  },
  barClip: {
    overflow: 'hidden',
  },
  barInactive: {
    backgroundColor: '#2E2A4A',
  },
  barLabel: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.dark.text.secondary,
  },
  barLabelActive: {
    color: colors.dark.text.primary,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingLeft: space[16],
    paddingRight: space[12],
    borderRadius: radius.lg,
    backgroundColor: 'rgba(124, 92, 255, 0.14)',
  },
  linkLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
});
