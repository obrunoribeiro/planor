// Home · Plano da semana — CONTEXTO.md §6.4. Node 47:1163 no Figma.
//
// Itens gerados toda segunda (`weekly-plan`); a caixa de seleção grava de verdade e o app marca
// sozinho o que dá pra saber pelos dados. Sem o selo "Até R$ X/mês" do Figma: nenhum dos tipos de
// item de hoje tem uma economia mensal pra mostrar (ver PROGRESSO.md).
import { colors, EmptyState, gradients, Icon, radius, ScreenHeader, SecondaryButton, Skeleton, space, typography } from '@planor/ui';
import { monthNamePtBR } from '@planor/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenGlow } from '@/components/ScreenGlow';
import { useToggleWeeklyPlanItemMutation, useWeeklyPlanQuery } from '@/lib/api/queries';
import type { WeeklyPlanItem } from '@/lib/api/types';
import { goBack } from '@/lib/navigation';
import { useMaskedMoneyText } from '@/lib/useMaskedMoneyText';

/** "2026-10-02" → "2 de outubro". */
function dayMonthLabel(dateKey: string): string {
  return `${Number(dateKey.slice(8, 10))} de ${monthNamePtBR(dateKey.slice(0, 7))}`;
}

function ItemCard({ item, onToggle }: { item: WeeklyPlanItem; onToggle: () => void }) {
  const mask = useMaskedMoneyText();
  return (
    <View style={styles.itemCard}>
      <Pressable
        onPress={onToggle}
        hitSlop={9}
        style={[styles.check, item.completed ? styles.checkDone : styles.checkEmpty]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.completed }}
        accessibilityLabel={item.title}
      >
        {item.completed && <Icon name="check" size={16} color={colors.dark.text.onBrand} />}
      </Pressable>
      <View style={styles.itemTexts}>
        <Text style={[styles.itemTitle, item.completed ? styles.itemTitleDone : null]}>{mask(item.title)}</Text>
        <Text style={styles.itemDescription}>{mask(item.description)}</Text>
        {item.completed ? (
          <Text style={styles.doneLabel}>{item.completedAt ? `Feito em ${dayMonthLabel(item.completedAt)}` : 'Feito'}</Text>
        ) : (
          <Pressable style={styles.action} onPress={() => router.push(item.actionRoute as Href)} accessibilityRole="link">
            <Text style={styles.actionLabel}>{item.actionLabel}</Text>
            <Icon name="seta-direita" size={14} color={colors.dark.text.brand} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function PlanoSemanaScreen() {
  const { data, isPending, isError, refetch } = useWeeklyPlanQuery();
  const { mutate: toggleItem } = useToggleWeeklyPlanItemMutation();

  if (isPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="Plano da semana" onBack={() => goBack('/')} />
          <Skeleton shape="bloco" width="100%" />
          <Skeleton shape="bloco" width="100%" />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <EmptyState icon="aviso" title="Não deu pra carregar" text="Confira sua internet e tenta de novo." actionLabel="Tentar de novo" onAction={() => refetch()} />
      </View>
    );
  }

  const doneCount = data.items.filter((item) => item.completed).length;

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Plano da semana" onBack={() => goBack('/')} />

        <LinearGradient
          colors={gradients.cardDestaque.colors}
          start={gradients.cardDestaque.start}
          end={gradients.cardDestaque.end}
          style={styles.progressCard}
        >
          <View style={styles.progressTop}>
            <Text style={styles.weekLabel}>{data.label}</Text>
            <Text style={styles.progressTitle}>
              {data.items.length === 0 ? 'Nada pendente' : `${doneCount} de ${data.items.length} feitas`}
            </Text>
          </View>
          {data.items.length > 0 && (
            <View style={styles.segments}>
              {data.items.map((item, index) =>
                item.completed ? (
                  <LinearGradient
                    key={index}
                    colors={gradients.progresso.colors}
                    start={gradients.progresso.start}
                    end={gradients.progresso.end}
                    style={styles.segment}
                  />
                ) : (
                  <View key={index} style={[styles.segment, styles.segmentEmpty]} />
                ),
              )}
            </View>
          )}
          <Text style={styles.progressNote}>Feito a partir dos seus gastos, contas e cartões. Toda segunda tem um plano novo.</Text>
        </LinearGradient>

        {data.items.length === 0 ? (
          <EmptyState icon="check" title="Tudo em dia" text="Não achamos nada pra fazer nesta semana. Na segunda, o Planor olha seus dados de novo." />
        ) : (
          <View style={styles.items}>
            {data.items.map((item, index) => (
              // A lista é fixa na semana (até 3 itens, sempre na mesma ordem): o índice é a identidade.
              <ItemCard key={index} item={item} onToggle={() => toggleItem({ index, completed: !item.completed })} />
            ))}
          </View>
        )}

        <View style={styles.spacer} />

        <SecondaryButton label="Conversar com a Planor IA sobre o plano" icon="ia" onPress={() => router.push('/ia')} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[24] },
  content: {
    flexGrow: 1,
    paddingTop: space[60],
    paddingHorizontal: space[24],
    paddingBottom: space[40],
    gap: space[20],
  },
  progressCard: {
    gap: space[12],
    padding: space[20],
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.5)',
  },
  progressTop: { gap: space[2] },
  weekLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.secondary,
  },
  progressTitle: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    lineHeight: typography.h2.lineHeight,
    letterSpacing: -0.22,
    color: colors.dark.text.primary,
  },
  segments: { flexDirection: 'row', gap: space[6] },
  segment: { flex: 1, height: 6, borderRadius: 3 },
  segmentEmpty: { backgroundColor: colors.dark.border.strong },
  progressNote: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
  items: { gap: space[12] },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[14],
    padding: space[16],
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  check: { width: 26, height: 26, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.dark.icon.success },
  checkEmpty: { borderWidth: 2, borderColor: colors.dark.border.strong },
  itemTexts: { flex: 1, gap: space[4] },
  itemTitle: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    lineHeight: typography.labelLarge.lineHeight,
    color: colors.dark.text.primary,
  },
  itemTitleDone: { color: colors.dark.text.tertiary, textDecorationLine: 'line-through' },
  itemDescription: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
  doneLabel: {
    paddingTop: space[6],
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.dark.text.success,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingTop: space[6], alignSelf: 'flex-start' },
  actionLabel: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.dark.text.brand,
  },
  spacer: { flex: 1 },
});
