// Lista/Categoria — CONTEXTO.md §6.5. Node 118:2677 no Figma (grupo "Sistema · Componentes").
import { formatCents } from '@planor/shared';
import { colors, gradients, Icon, space, typography, useRevealProgress, type IconName } from '@planor/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

export type CategoryRowProps = {
  icon: IconName;
  name: string;
  amountCents: number;
  kind: 'Fixo' | 'Variável';
  pctOfTotal: number;
  onPress?: () => void;
};

export function CategoryRow({ icon, name, amountCents, kind, pctOfTotal, onPress }: CategoryRowProps) {
  const { progress, ref } = useRevealProgress(pctOfTotal);
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole={onPress ? 'button' : undefined}>
      <View style={styles.iconBox}>
        <Icon name={icon} size={20} color={colors.dark.text.primary} />
      </View>
      <View style={styles.texts}>
        <View style={styles.line}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.amount}>{formatCents(amountCents)}</Text>
        </View>
        <Animated.View ref={ref} collapsable={false} style={styles.track}>
          <Animated.View style={[styles.fill, fillStyle]}>
            <LinearGradient
              colors={gradients.progresso.colors}
              start={gradients.progresso.start}
              end={gradients.progresso.end}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Animated.View>
        <View style={styles.line}>
          <Text style={styles.kind}>{kind}</Text>
          <Text style={styles.pct}>{pctOfTotal}% do total</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingVertical: space[12],
    width: '100%',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.control,
  },
  texts: {
    flex: 1,
    gap: space[6],
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  name: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  amount: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dark.border.strong,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
  kind: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  pct: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
});
