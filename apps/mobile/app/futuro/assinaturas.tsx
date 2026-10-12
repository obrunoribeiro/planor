// Futuro · Assinaturas — CONTEXTO.md §6.6. Nodes 31:577 (lista) e 49:1179 (ordenar) no Figma.
//
// Total por mês e por ano, aviso das marcadas como sem uso ("Cancelar economiza R$ X por mês"),
// selos "Sem uso" e "Subiu X%", e ordenação. As canceladas pelo usuário ficam no fim, fora dos
// totais. Tocar abre o detalhe.
import { Avatar, colors, EmptyState, gradients, Icon, radius, ScreenHeader, Sheet, Skeleton, space, typography } from '@planor/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money } from '@/components/Money';
import { ScreenGlow } from '@/components/ScreenGlow';
import { initialColor, SORT_LABEL, sortSubscriptions, type SubscriptionSort } from '@/features/assinaturas/labels';
import { useSubscriptionsQuery } from '@/lib/api/queries';
import type { SubscriptionItem } from '@/lib/api/types';
import { dayMonthFromIso } from '@/lib/format';
import { goBack } from '@/lib/navigation';

function Badge({ label, tone }: { label: string; tone: 'alert' | 'error' | 'neutral' }) {
  const palette = {
    alert: { bg: colors.dark.bg.alertSubtle, text: colors.dark.text.alert },
    error: { bg: colors.dark.bg.errorSubtle, text: colors.dark.text.error },
    neutral: { bg: colors.dark.bg.elevated, text: colors.dark.text.tertiary },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeLabel, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

function Row({ item, index, last }: { item: SubscriptionItem; index: number; last: boolean }) {
  const cancelled = item.status === 'cancelled_by_user';
  return (
    <Pressable
      style={[styles.row, last ? null : styles.rowBorder]}
      onPress={() => router.push({ pathname: '/futuro/assinatura/[id]', params: { id: item.id } })}
      accessibilityRole="button"
    >
      <Avatar initials={item.merchantName.charAt(0).toUpperCase()} size={36} variant="solid" color={initialColor(index)} />
      <View style={styles.rowTexts}>
        <Text style={[styles.rowName, cancelled ? styles.rowNameCancelled : null]} numberOfLines={1}>
          {item.merchantName}
        </Text>
        <View style={styles.rowLine}>
          {!cancelled && item.nextChargeAt && (
            <Text style={styles.rowCaption}>
              {/* Data prevista que já passou sem cobrança: não fingir que "renova" (§1, honestidade). */}
              {new Date(item.nextChargeAt) < new Date() ? 'não cobrou em ' : 'renova '}
              {dayMonthFromIso(item.nextChargeAt)}
            </Text>
          )}
          {cancelled && <Badge label="Cancelada" tone="neutral" />}
          {!cancelled && item.usage === 'none' && <Badge label="Sem uso" tone="alert" />}
          {!cancelled && item.priceChange && item.priceChange.pct > 0 && <Badge label={`Subiu ${item.priceChange.pct}%`} tone="error" />}
        </View>
      </View>
      <Money cents={item.amountCents} style={[styles.rowAmount, cancelled ? styles.rowNameCancelled : null]} />
    </Pressable>
  );
}

export default function AssinaturasScreen() {
  const { data, isPending, isError, refetch } = useSubscriptionsQuery();
  const [sort, setSort] = useState<SubscriptionSort>('amount');
  const [sortVisible, setSortVisible] = useState(false);

  if (isPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="Assinaturas" onBack={() => goBack('/futuro')} />
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

  const active = sortSubscriptions(data.items.filter((i) => i.status === 'active'), sort);
  const cancelled = data.items.filter((i) => i.status === 'cancelled_by_user');
  const listed = [...active, ...cancelled];

  const sortButton = (
    <Pressable style={styles.headerButton} onPress={() => setSortVisible(true)} accessibilityLabel="Ordenar assinaturas">
      <Icon name="filtro" size={20} color={colors.dark.text.primary} />
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Assinaturas" onBack={() => goBack('/futuro')} action={listed.length > 0 ? sortButton : undefined} />

        {listed.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="assinaturas"
              title="Nenhuma assinatura encontrada"
              text="Quando o mesmo serviço cobrar você todo mês, ele aparece aqui com o total por mês e por ano."
            />
          </View>
        ) : (
          <>
            <LinearGradient
              colors={gradients.resumoAssinaturas.colors}
              locations={gradients.resumoAssinaturas.locations}
              start={gradients.resumoAssinaturas.start}
              end={gradients.resumoAssinaturas.end}
              style={styles.summary}
            >
              <View style={styles.summaryValues}>
                <View style={styles.summaryValue}>
                  <Text style={styles.summaryLabel}>Por mês</Text>
                  <Money cents={data.monthlyCents} style={styles.summaryAmount} />
                </View>
                <View style={styles.summaryValue}>
                  <Text style={styles.summaryLabel}>Por ano</Text>
                  <Money cents={data.yearlyCents} style={styles.summaryAmount} />
                </View>
              </View>
              {data.unused.count > 0 && (
                <View style={styles.notice}>
                  <Icon name="aviso" size={20} color={colors.dark.text.alert} />
                  <Text style={styles.noticeText}>
                    {data.unused.count === 1 ? '1 você marcou como sem uso.' : `${data.unused.count} você marcou como sem uso.`} Cancelar
                    economiza <Money cents={data.unused.monthlyCents} style={styles.noticeText} /> por mês.
                  </Text>
                </View>
              )}
            </LinearGradient>

            <View style={styles.list}>
              {listed.map((item, index) => (
                <Row key={item.id} item={item} index={index} last={index === listed.length - 1} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Sheet visible={sortVisible} title="Ordenar" onClose={() => setSortVisible(false)}>
        <View>
          {(Object.keys(SORT_LABEL) as SubscriptionSort[]).map((option) => (
            <Pressable
              key={option}
              style={styles.sortOption}
              onPress={() => {
                setSort(option);
                setSortVisible(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: sort === option }}
            >
              <Text style={styles.sortLabel}>{SORT_LABEL[option]}</Text>
              {sort === option && <Icon name="check" size={18} color={colors.dark.text.brand} />}
            </Pressable>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[24] },
  content: {
    paddingTop: space[60],
    paddingHorizontal: space[24],
    paddingBottom: space[40],
    gap: space[20],
  },
  emptyWrap: { paddingTop: space[40] },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.surface,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
  },
  summary: {
    gap: space[12],
    padding: space[20],
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: 'rgba(200, 198, 254, 0.2)',
  },
  summaryValues: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryValue: { gap: space[2] },
  summaryLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.secondary,
  },
  summaryAmount: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    lineHeight: 32,
    letterSpacing: -0.22,
    color: colors.dark.text.primary,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[12],
    paddingHorizontal: space[16],
    paddingVertical: space[14],
    borderRadius: radius['2xl'],
    backgroundColor: colors.dark.bg.alertSubtle,
  },
  noticeText: {
    flex: 1,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
  list: {
    paddingHorizontal: space[16],
    paddingVertical: space[4],
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[12] },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.dark.border.default },
  rowTexts: { flex: 1, gap: space[2] },
  rowName: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  rowNameCancelled: { color: colors.dark.text.tertiary },
  rowLine: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  rowCaption: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  rowAmount: {
    fontFamily: typography.numberSmall.fontFamily,
    fontSize: typography.numberSmall.fontSize,
    lineHeight: typography.numberSmall.lineHeight,
    color: colors.dark.text.primary,
  },
  badge: { paddingHorizontal: space[10], paddingVertical: space[4], borderRadius: 10 },
  badgeLabel: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space[14],
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border.default,
  },
  sortLabel: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    lineHeight: typography.labelLarge.lineHeight,
    color: colors.dark.text.primary,
  },
});
