// Lista/Categoria — CONTEXTO.md §6.5. Node 118:2677 no Figma (grupo "Sistema · Componentes").
import { Money } from '@/components/Money';
import {
  colors,
  gradients,
  Icon,
  space,
  typography,
  useRevealProgress,
  type IconName,
} from '@planor/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

export type CategoryRowProps = {
  icon: IconName;
  name: string;
  amountCents: number;
  /** Legenda embaixo da barra: "Fixo"/"Variável", ou um texto curto pra linhas especiais. */
  kind: string;
  pctOfTotal: number;
  onPress?: () => void;
};

export function CategoryRow({
  icon,
  name,
  amountCents,
  kind,
  pctOfTotal,
  onPress,
}: CategoryRowProps) {
  const { progress, ref } = useRevealProgress(pctOfTotal);
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={styles.iconBox}>
        <Icon name={icon} size={20} color={colors.dark.text.primary} />
      </View>
      <View style={styles.texts}>
        <View style={styles.line}>
          <Text style={styles.name}>{name}</Text>
          <Money cents={amountCents} style={styles.amount} />
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
  // Texto da esquerda ocupa o que sobra e quebra linha; valor e percentual não encolhem.
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space[8],
  },
  name: {
    flex: 1,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  amount: {
    flexShrink: 0,
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
    flex: 1,
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  pct: {
    flexShrink: 0,
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
});
