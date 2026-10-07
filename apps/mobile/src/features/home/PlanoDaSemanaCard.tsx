// "Plano da semana" — CONTEXTO.md §6.4. Node 25:223 no Figma.
import { useState } from 'react';
import { Badge, Checkbox, colors, space, radius, typography } from '@planor/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { WeeklyPlanItem } from '@/lib/api/types';

export type PlanoDaSemanaCardProps = {
  items: WeeklyPlanItem[];
};

export function PlanoDaSemanaCard({ items }: PlanoDaSemanaCardProps) {
  // Sem rota pra persistir o toggle ainda (§8 não lista um PATCH pros itens do plano) — o estado
  // local só reflete o que já veio marcado automaticamente pelos dados (CONTEXTO.md §6.4: "o app
  // marca o item como feito sozinho, pelos dados").
  const [doneIndexes, setDoneIndexes] = useState<number[]>(
    items.flatMap((item, index) => (item.completed ? [index] : [])),
  );

  const toggle = (index: number) => {
    setDoneIndexes((prev) => (prev.includes(index) ? prev.filter((x) => x !== index) : [...prev, index]));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Plano da semana</Text>
        <Badge tone="success" label={`${doneIndexes.length} de ${items.length} feitas`} />
      </View>

      {items.map((item, index) => {
        const done = doneIndexes.includes(index);
        return (
          <Pressable key={item.title} style={styles.item} onPress={() => toggle(index)}>
            <Checkbox checked={done} onPress={() => toggle(index)} accessibilityLabel={item.title} />
            <View style={styles.itemText}>
              <Text style={[styles.itemTitle, done ? styles.itemTitleDone : null]}>{item.title}</Text>
              <Text style={styles.itemDescription}>{item.description}</Text>
            </View>
          </Pressable>
        );
      })}
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
