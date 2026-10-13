// Card/Meta — Figma 51:1177 (lista de metas). Ícone, nome, "R$ X de R$ Y", barra e a linha de
// contexto que vem pronta da API (com valores que obedecem ao olho).
import { colors, gradients, Icon, type IconName, radius, space, typography } from '@planor/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Money } from '@/components/Money';
import { categoryIcon } from '@/features/gastos/categoryIcons';
import type { GoalItem } from '@/lib/api/types';
import { useMaskedMoneyText } from '@/lib/useMaskedMoneyText';

export function goalIcon(goal: Pick<GoalItem, 'type' | 'icon' | 'categoryName'>): IconName {
  if (goal.icon) return goal.icon as IconName;
  return goal.type === 'category_limit' && goal.categoryName
    ? categoryIcon(goal.categoryName)
    : 'meta';
}

export function GoalProgress({ goal }: { goal: GoalItem }) {
  const percent =
    goal.targetCents > 0 ? Math.min(100, (goal.currentCents / goal.targetCents) * 100) : 0;
  const over = goal.status === 'exceeded';
  return (
    <View style={styles.track}>
      {percent > 0 && (
        <LinearGradient
          colors={
            over ? [colors.dark.text.error, colors.dark.text.error] : gradients.progresso.colors
          }
          start={gradients.progresso.start}
          end={gradients.progresso.end}
          style={[styles.fill, { width: `${percent}%` }]}
        />
      )}
    </View>
  );
}

export function GoalCard({ goal }: { goal: GoalItem }) {
  const mask = useMaskedMoneyText();
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: '/ia/meta/[id]', params: { id: goal.id } })}
      accessibilityRole="button"
    >
      <View style={styles.top}>
        <LinearGradient
          colors={gradients.icone.colors}
          start={gradients.icone.start}
          end={gradients.icone.end}
          style={styles.icon}
        >
          <Icon name={goalIcon(goal)} size={22} color={colors.dark.text.primary} />
        </LinearGradient>
        <View style={styles.texts}>
          <Text style={styles.name} numberOfLines={1}>
            {goal.name}
          </Text>
          <Text style={styles.amounts}>
            <Money cents={goal.currentCents} style={styles.amounts} /> de{' '}
            <Money cents={goal.targetCents} style={styles.amounts} />
            {goal.type === 'category_limit' ? ' por mês' : ''}
          </Text>
        </View>
        <Icon name="seta-direita" size={18} color={colors.dark.text.tertiary} />
      </View>
      <GoalProgress goal={goal} />
      <Text style={styles.caption}>{mask(goal.caption)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[12],
    padding: space[16],
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: space[2] },
  name: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    lineHeight: typography.labelLarge.lineHeight,
    color: colors.dark.text.primary,
  },
  amounts: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.secondary,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.dark.border.strong,
  },
  fill: { height: '100%', borderRadius: 4 },
  caption: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
});
