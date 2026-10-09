// Gastos · Categoria — CONTEXTO.md §6.5 ("total do mês, número de pedidos e ticket médio; gráfico
// dos últimos 6 meses com a média; lista de transações"). Node 28:396 no Figma.
//
// Fora por enquanto (ver PROGRESSO.md): a "dica da IA" com "Criar limite" (IA e limites de
// categoria são Fase 3) e o lápis de "Editar categoria" (sheet própria, ainda não existe).
import { colors, EmptyState, gradients, Icon, radius, ScreenHeader, Skeleton, space, typography, useRevealProgress } from '@planor/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Money } from '@/components/Money';
import { ScreenGlow } from '@/components/ScreenGlow';
import { categoryIcon } from '@/features/gastos/categoryIcons';
import { TransactionRow } from '@/features/gastos/TransactionRow';
import { useCategoryDetailQuery } from '@/lib/api/queries';
import { useHiddenValuesStore } from '@/lib/stores/useHiddenValuesStore';
import { capitalize, dayTimeLabel, monthNamePtBR } from '@/lib/format';
import { formatCents } from '@planor/shared';

const MAX_BAR_HEIGHT = 100;

function Bar({ height, active }: { height: number; active: boolean }) {
  const { progress, ref } = useRevealProgress(height);
  const style = useAnimatedStyle(() => ({ height: progress.value }));

  if (active) {
    return (
      <Animated.View ref={ref} collapsable={false} style={[styles.bar, styles.barClip, style]}>
        <LinearGradient colors={gradients.icone.colors} start={gradients.icone.start} end={gradients.icone.end} style={StyleSheet.absoluteFill} />
      </Animated.View>
    );
  }
  return <Animated.View ref={ref} collapsable={false} style={[styles.bar, styles.barInactive, style]} />;
}

export default function CategoriaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, refetch } = useCategoryDetailQuery(id);
  const hidden = useHiddenValuesStore((state) => state.hidden);

  if (isPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="" onBack={() => router.back()} />
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

  const maxAmount = Math.max(...data.months.map((m) => m.amountCents), 1);
  const countLabel = `${data.transactionsCount} ${data.transactionsCount === 1 ? 'compra' : 'compras'}`;
  const averageTicket = data.averageTicketCents !== null ? ` · média de ${hidden ? 'R$ ••••' : formatCents(data.averageTicketCents)}` : '';

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title={data.category.name} onBack={() => router.back()} />

        <View style={styles.summary}>
          <LinearGradient colors={gradients.icone.colors} start={gradients.icone.start} end={gradients.icone.end} style={styles.iconTile}>
            <Icon name={categoryIcon(data.category.name)} size={25.2} color={colors.dark.text.primary} />
          </LinearGradient>
          <Text style={styles.monthLabel}>Gasto em {monthNamePtBR(data.month)}</Text>
          <Money style={styles.total} cents={data.totalCents} />
          <Text style={styles.caption}>
            {countLabel}
            {averageTicket}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>Últimos 6 meses</Text>
            {data.monthlyAverageCents !== null && (
              <Text style={styles.caption}>Média {hidden ? 'R$ ••••' : formatCents(data.monthlyAverageCents)}</Text>
            )}
          </View>
          <View style={styles.bars}>
            {data.months.map((m, i) => {
              const active = i === data.months.length - 1;
              return (
                <View key={m.month} style={styles.barColumn}>
                  <Bar height={Math.max((m.amountCents / maxAmount) * MAX_BAR_HEIGHT, 4)} active={active} />
                  <Text style={[styles.barLabel, active && styles.barLabelActive]}>{m.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.listTitleRow}>
          <Text style={styles.listTitle}>Transações</Text>
          <Text style={styles.listCount}>{data.transactionsCount}</Text>
        </View>

        {data.transactions.length === 0 ? (
          <EmptyState icon="gastos" title="Nenhuma compra neste mês" text="Quando aparecer um gasto nessa categoria, ele entra aqui." />
        ) : (
          <View>
            {data.transactions.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                subtitle={capitalize(dayTimeLabel(t.postedAt))}
                amountCaption={t.accountName}
                onPress={() => router.push(`/gastos/transacao/${t.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[24] },
  content: { paddingTop: space[60], paddingHorizontal: space[24], paddingBottom: space[40], gap: space[20] },
  summary: { alignItems: 'center', gap: space[6], paddingTop: space[8] },
  iconTile: { width: 56, height: 56, borderRadius: 17.92, alignItems: 'center', justifyContent: 'center' },
  monthLabel: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    lineHeight: typography.bodyMedium.lineHeight,
    color: colors.dark.text.secondary,
  },
  total: {
    fontFamily: typography.numberXl.fontFamily,
    fontSize: typography.numberXl.fontSize,
    lineHeight: typography.numberXl.lineHeight,
    letterSpacing: typography.numberXl.letterSpacing,
    color: colors.dark.text.primary,
  },
  caption: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  card: {
    backgroundColor: colors.dark.bg.surface,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    borderRadius: radius['3xl'],
    padding: space[20],
    gap: space[16],
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: space[10], height: MAX_BAR_HEIGHT + 22 },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: space[6] },
  bar: { width: '100%', borderRadius: radius.sm },
  barClip: { overflow: 'hidden' },
  // Mesmo trilho das outras barras do app (JaComprometidoCard, Gauge) — #2E2A4A vem do Figma,
  // sem token semântico.
  barInactive: { backgroundColor: '#2E2A4A' },
  barLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  barLabelActive: { color: colors.dark.text.primary },
  listTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  listTitle: {
    fontFamily: typography.h3.fontFamily,
    fontSize: typography.h3.fontSize,
    lineHeight: typography.h3.lineHeight,
    color: colors.dark.text.primary,
  },
  listCount: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.tertiary,
  },
});
