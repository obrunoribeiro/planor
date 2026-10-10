// "Plano da semana" — CONTEXTO.md §6.4. Node 25:223 no Figma.
//
// A caixa de seleção grava de verdade (`PATCH /weekly-plan/items/:index`); itens que o app
// conclui sozinho pelos dados já chegam marcados. Tocar no título abre a tela do plano.
import { Badge, Checkbox, colors, space, radius, typography } from '@planor/ui';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useToggleWeeklyPlanItemMutation } from '@/lib/api/queries';
import type { WeeklyPlanItem } from '@/lib/api/types';
import { useMaskedMoneyText } from '@/lib/useMaskedMoneyText';

export type PlanoDaSemanaCardProps = {
  items: WeeklyPlanItem[];
};

export function PlanoDaSemanaCard({ items }: PlanoDaSemanaCardProps) {
  const { mutate: toggleItem } = useToggleWeeklyPlanItemMutation();
  const mask = useMaskedMoneyText();
  const doneCount = items.filter((item) => item.completed).length;

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={() => router.push('/plano-semana')} accessibilityRole="button">
        <Text style={styles.title}>Plano da semana</Text>
        {items.length > 0 && <Badge tone="success" label={`${doneCount} de ${items.length} feitas`} />}
      </Pressable>

      {items.length === 0 && <Text style={styles.itemDescription}>Nada pendente nesta semana. Toda segunda tem um plano novo.</Text>}

      {items.map((item, index) => (
        // A lista é fixa na semana (até 3 itens, sempre na mesma ordem): o índice é a identidade.
        <Pressable key={index} style={styles.item} onPress={() => router.push('/plano-semana')}>
          <Checkbox
            checked={item.completed}
            onPress={() => toggleItem({ index, completed: !item.completed })}
            accessibilityLabel={item.title}
          />
          <View style={styles.itemText}>
            <Text style={[styles.itemTitle, item.completed ? styles.itemTitleDone : null]}>{mask(item.title)}</Text>
            <Text style={styles.itemDescription}>{mask(item.description)}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space[14],
    padding: space[20],
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: typography.h3.fontFamily,
    fontSize: typography.h3.fontSize,
    lineHeight: typography.h3.lineHeight,
    letterSpacing: typography.h3.letterSpacing,
    color: colors.dark.text.primary,
  },
  item: {
    flexDirection: 'row',
    gap: space[12],
    alignItems: 'flex-start',
  },
  itemText: {
    flex: 1,
    gap: space[2],
  },
  itemTitle: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 15,
    lineHeight: 20,
    color: colors.dark.text.primary,
  },
  itemTitleDone: {
    color: colors.dark.text.tertiary,
    textDecorationLine: 'line-through',
  },
  itemDescription: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: 18,
    color: colors.dark.text.tertiary,
  },
});
