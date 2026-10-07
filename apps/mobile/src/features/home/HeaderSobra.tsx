// Topo da Home — "Sobra prevista" (CONTEXTO.md §6.4). Node 25:151 no Figma.
import { Avatar, colors, gradients, GlowOrb, Icon, ProgressBar, space, typography } from '@planor/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Money } from '@/components/Money';
import { untilEndOfMonthLabel, initialsFromName } from '@/lib/format';
import { useHiddenValuesStore } from '@/lib/stores/useHiddenValuesStore';
import type { HomeResponse } from '@/lib/api/types';

// TODO: ligar a navegação de alertas e "como calculamos a sobra" quando essas telas existirem
// (paywall também — ver CONTEXTO.md §13). O avatar já leva pro Perfil, que é a próxima da ordem
// da Fase 1 a existir.

export type HeaderSobraProps = {
  userName: string | null;
  unreadAlerts: number;
  leftover: HomeResponse['leftover'];
  month: string;
};

export function HeaderSobra({ userName, unreadAlerts, leftover, month }: HeaderSobraProps) {
  const hidden = useHiddenValuesStore((state) => state.hidden);
  const toggleHidden = useHiddenValuesStore((state) => state.toggle);
  const spentPct = (leftover.spentThisMonthCents / leftover.monthlyIncomeCents) * 100;
  const duePct = (leftover.dueUntilMonthEndCents / leftover.monthlyIncomeCents) * 100;

  return (
    <LinearGradient
      colors={gradients.headerSobra.colors}
      locations={gradients.headerSobra.locations}
      start={gradients.headerSobra.start}
      end={gradients.headerSobra.end}
      style={styles.container}
    >
      <View style={styles.glow} pointerEvents="none">
        <GlowOrb width={420} color="#9385FF" />
      </View>

      <View style={styles.topRow}>
        <Pressable style={styles.topRowTouchable} onPress={() => router.push('/perfil')}>
          <Avatar initials={initialsFromName(userName)} size={48} />
          <View style={styles.greeting}>
            <Text style={styles.greetingLabel}>Boa tarde,</Text>
            <Text style={styles.greetingName}>{userName ?? '—'}</Text>
          </View>
        </Pressable>
        <View style={styles.proBadge}>
          <Icon name="estrela" size={14} color={colors.dark.text.brand} />
          <Text style={styles.proBadgeLabel}>Planor Pro</Text>
        </View>
        <Pressable style={styles.alertsButton} accessibilityLabel="Central de alertas">
          <Icon name="sino" size={20} color={colors.dark.text.primary} />
          {unreadAlerts > 0 && <View style={styles.alertsDot} />}
        </Pressable>
      </View>

      <View style={styles.valueBlock}>
        <View style={styles.valueLegendRow}>
          <Text style={styles.valueLegend}>Sobra prevista até {untilEndOfMonthLabel(month)}</Text>
          <Pressable
            onPress={toggleHidden}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar valores' : 'Ocultar valores'}
          >
            <View style={styles.eyeWrap}>
              <Icon name="olho" size={18} color={hidden ? colors.dark.text.brand : colors.dark.text.secondary} />
              {/* O Figma só tem "Ícone/Olho" — sem variante fechada. Em vez de inventar um glifo
                  novo, risca o ícone real com um traço diagonal (igual o "slash" que outros apps
                  usam no olho fechado). Se um dia o Figma ganhar um ícone de olho fechado de
                  verdade, troca isso por ele. */}
              {hidden && <View pointerEvents="none" style={styles.eyeSlash} />}
            </View>
          </Pressable>
        </View>
        <Money style={styles.valueAmount} cents={leftover.projectedLeftoverCents} />
      </View>

      <View style={styles.composition}>
        <ProgressBar
          height={10}
          trackColor="rgba(11, 10, 18, 0.45)"
          gap={2}
          segments={[
            { percent: spentPct, color: '#C8C6FE' },
            { percent: duePct, color: colors.dark.bg.brand },
          ]}
        />
        <View style={styles.compositionLegendRow}>
          <View style={styles.compositionLegendItem}>
            <View style={[styles.dot, { backgroundColor: '#C8C6FE' }]} />
            <Text style={styles.compositionLegendText}>
              Gasto <Money style={styles.compositionLegendValue} cents={leftover.spentThisMonthCents} />
            </Text>
          </View>
          <View style={styles.compositionLegendItem}>
            <View style={[styles.dot, { backgroundColor: colors.dark.bg.brand }]} />
            <Text style={styles.compositionLegendText}>
              A vencer <Money style={styles.compositionLegendValue} cents={leftover.dueUntilMonthEndCents} />
            </Text>
          </View>
        </View>
        <Text style={styles.incomeNote}>
          De uma renda de <Money style={styles.incomeNote} cents={leftover.monthlyIncomeCents} /> no mês
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: space[60],
    paddingBottom: space[24],
    paddingHorizontal: space[20],
    gap: space[20],
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -160,
    left: 210,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
  },
  topRowTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
  },
  greeting: {
    flex: 1,
  },
  greetingLabel: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: 18,
    color: colors.dark.text.brand,
  },
  greetingName: {
    fontFamily: typography.h3.fontFamily,
    fontSize: typography.h3.fontSize,
    lineHeight: typography.h3.lineHeight,
    letterSpacing: typography.h3.letterSpacing,
    color: colors.dark.text.primary,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    height: 36,
    paddingHorizontal: space[12],
    borderRadius: 18,
    backgroundColor: 'rgba(11, 10, 18, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(200, 198, 254, 0.35)',
  },
  proBadgeLabel: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.dark.text.brand,
  },
  alertsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 10, 18, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(200, 198, 254, 0.25)',
  },
  alertsDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.dark.text.error,
    borderWidth: 2,
    borderColor: '#1A1440',
  },
  valueBlock: {
    gap: space[4],
  },
  valueLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
  },
  eyeWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeSlash: {
    position: 'absolute',
    width: 20,
    height: 1.8,
    borderRadius: 1,
    backgroundColor: colors.dark.text.brand,
    transform: [{ rotate: '45deg' }],
  },
  valueLegend: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    color: colors.dark.text.secondary,
  },
  valueAmount: {
    fontFamily: typography.display.fontFamily,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.8,
    color: colors.dark.text.primary,
  },
  composition: {
    gap: space[10],
  },
  compositionLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  compositionLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compositionLegendText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.secondary,
  },
  compositionLegendValue: {
    fontFamily: typography.labelSmall.fontFamily,
    color: colors.dark.text.primary,
  },
  incomeNote: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.brand,
  },
});
