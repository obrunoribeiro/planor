// Gastos · Resumo — CONTEXTO.md §6.5. Node 28:187 no Figma.
import { Badge, Chip, colors, Donut, EmptyState, gradients, GlowOrb, Icon, ProgressBar, RevealScrollView, Sheet, Skeleton, space, typography } from '@planor/ui';
import { formatCents } from '@planor/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CategoryRow } from '@/features/gastos/CategoryRow';
import { categoryIcon } from '@/features/gastos/categoryIcons';
import { monthNamePtBR } from '@/lib/format';
import { useSpendingSummaryQuery } from '@/lib/api/queries';

const TRANSACTION_TYPES = ['Todas', 'Saídas', 'Entradas', 'Parcelas'] as const;

// Mesma paleta de roxos usada no Figma pra rosca (CONTEXTO.md §4) — a API não manda cor, só o
// nome/valor de cada categoria, então o ciclo de cores é uma escolha de apresentação do app.
const DONUT_COLORS = ['#7C5CFF', '#AEA8FF', '#4F34BE', '#E0E0FF', '#392594', '#9385FF', '#25176C'];

export default function GastosScreen() {
  const { data, isPending, isError, refetch } = useSpendingSummaryQuery();
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<(typeof TRANSACTION_TYPES)[number]>('Todas');

  return (
    <View style={styles.screen}>
      <View style={styles.glow} pointerEvents="none">
        <GlowOrb
          width={630}
          height={480}
          color="#7C5CFF"
          stops={[
            { offset: 0, opacity: 0.35 },
            { offset: 0.55, opacity: 0.1225 },
            { offset: 1, opacity: 0 },
          ]}
        />
      </View>

      {isPending ? (
        <View style={styles.skeletonScreen}>
          <Skeleton shape="bloco" width="100%" />
          <Skeleton shape="bloco" width="100%" />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <EmptyState
            icon="aviso"
            title="Não deu pra carregar"
            text="Confira sua internet e tenta de novo."
            actionLabel="Tentar de novo"
            onAction={() => refetch()}
          />
        </View>
      ) : (
        <RevealScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <Text style={styles.pageTitle}>Gastos</Text>
            {/* TODO: navegar pra /gastos/busca quando essa tela existir. */}
            <Pressable style={styles.iconButton} accessibilityLabel="Buscar">
              <Icon name="busca" size={20} color={colors.dark.text.primary} />
            </Pressable>
            <Pressable style={styles.iconButton} accessibilityLabel="Filtros" onPress={() => setFiltersVisible(true)}>
              <Icon name="filtro" size={20} color={colors.dark.text.primary} />
            </Pressable>
          </View>

          {/* TODO: trocar de mês de verdade e abrir o sheet "Escolher período" quando existirem. */}
          <View style={styles.monthRow}>
            <Icon name="voltar" size={24} color={colors.dark.text.secondary} />
            <Text style={styles.monthLabel}>{monthNamePtBR(data.month)}</Text>
            <Icon name="seta-direita" size={24} color={colors.dark.text.secondary} />
          </View>

          <LinearGradient
            colors={gradients.totalGastos.colors}
            locations={gradients.totalGastos.locations}
            start={gradients.totalGastos.start}
            end={gradients.totalGastos.end}
            style={styles.totalCard}
          >
            <View style={styles.totalTop}>
              <View style={styles.donutWrap}>
                <Donut
                  segments={data.categories.map((c, i) => ({ percent: c.pctOfTotal, color: DONUT_COLORS[i % DONUT_COLORS.length]! }))}
                  size={132}
                  strokeWidth={16}
                />
                <View style={styles.donutCenter}>
                  <Text style={styles.donutCount}>{data.categoriesCount}</Text>
                  <Text style={styles.donutLabel}>categorias</Text>
                </View>
              </View>
              <View style={styles.totalValues}>
                <Text style={styles.totalLabel}>Total gasto</Text>
                <Text style={styles.totalAmount}>{formatCents(data.totalCents)}</Text>
                {data.trendVsLastMonthPct !== null && (
                  <Badge
                    tone={data.trendVsLastMonthPct > 0 ? 'error' : 'success'}
                    label={`${data.trendVsLastMonthPct > 0 ? '+' : ''}${data.trendVsLastMonthPct}% que o mês anterior`}
                  />
                )}
              </View>
            </View>

            <View style={styles.fixedVariable}>
              <ProgressBar
                height={10}
                trackColor={colors.dark.border.strong}
                gap={3}
                segments={[
                  { percent: data.fixedPct, color: colors.dark.bg.brand },
                  { percent: data.variablePct, color: '#C8C6FE' },
                ]}
              />
              <View style={styles.fixedVariableLegend}>
                <View style={styles.legendItem}>
                  <View style={styles.legendRow}>
                    <View style={[styles.dot, { backgroundColor: colors.dark.bg.brand }]} />
                    <Text style={styles.legendLabel}>Fixos {data.fixedPct}%</Text>
                  </View>
                  <Text style={styles.legendValue}>{formatCents(data.fixedCents)}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={styles.legendRow}>
                    <View style={[styles.dot, { backgroundColor: '#C8C6FE' }]} />
                    <Text style={styles.legendLabel}>Variáveis {data.variablePct}%</Text>
                  </View>
                  <Text style={styles.legendValue}>{formatCents(data.variableCents)}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.categoriesHeader}>
            <Text style={styles.sectionTitle}>Por categoria</Text>
            {/* TODO: navegar pra /gastos/categorias (lista completa) quando existir. */}
            <Pressable>
              <Text style={styles.seeAllLink}>Ver todas</Text>
            </Pressable>
          </View>

          {data.categories.length === 0 ? (
            <EmptyState icon="gastos" title="Nada por aqui ainda" text="Assim que você tiver gastos categorizados este mês, eles aparecem aqui." />
          ) : (
            <View style={styles.categoriesCard}>
              {data.categories.map((category) => (
                <CategoryRow
                  key={category.categoryId}
                  icon={categoryIcon(category.name)}
                  name={category.name}
                  amountCents={category.amountCents}
                  kind={category.kind === 'fixed' ? 'Fixo' : 'Variável'}
                  pctOfTotal={category.pctOfTotal}
                />
              ))}
            </View>
          )}

          <Pressable style={styles.secondaryButton} onPress={() => router.push('/gastos/transacoes')}>
            <Text style={styles.secondaryButtonLabel}>Ver todas as transações</Text>
          </Pressable>
        </RevealScrollView>
      )}

      {/* TODO: filtros de contas, categorias e faixa de valor (§6.5) — por enquanto só o tipo. */}
      <Sheet visible={filtersVisible} title="Filtros" onClose={() => setFiltersVisible(false)}>
        <Text style={styles.sheetLabel}>Tipo</Text>
        <View style={styles.sheetChips}>
          {TRANSACTION_TYPES.map((type) => (
            <Chip key={type} label={type} active={type === transactionType} onPress={() => setTransactionType(type)} />
          ))}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.dark.bg.default,
  },
  glow: {
    position: 'absolute',
    top: -160,
    left: -120,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[24],
  },
  skeletonScreen: {
    flex: 1,
    paddingTop: space[60],
    paddingHorizontal: space[24],
    gap: space[20],
  },
  content: {
    paddingTop: space[60],
    paddingHorizontal: space[24],
    paddingBottom: 132,
    gap: space[20],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
  },
  pageTitle: {
    flex: 1,
    fontFamily: typography.h1.fontFamily,
    fontSize: typography.h1.fontSize,
    lineHeight: typography.h1.lineHeight,
    letterSpacing: typography.h1.letterSpacing,
    color: colors.dark.text.primary,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.surface,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthLabel: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    lineHeight: typography.labelLarge.lineHeight,
    color: colors.dark.text.primary,
  },
  totalCard: {
    gap: space[20],
    padding: space[20],
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(200, 198, 254, 0.2)',
  },
  totalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[16],
  },
  donutWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  donutCount: {
    fontFamily: typography.numberLarge.fontFamily,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.24,
    color: colors.dark.text.primary,
  },
  donutLabel: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.dark.text.secondary,
  },
  totalValues: {
    flex: 1,
    gap: space[4],
  },
  totalLabel: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    color: colors.dark.text.secondary,
  },
  totalAmount: {
    fontFamily: typography.h1.fontFamily,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.28,
    color: colors.dark.text.primary,
  },
  fixedVariable: {
    gap: space[10],
  },
  fixedVariableLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    gap: space[2],
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.secondary,
  },
  legendValue: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    color: colors.dark.text.primary,
  },
  categoriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space[4],
  },
  sectionTitle: {
    fontFamily: typography.h2.fontFamily,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.2,
    color: colors.dark.text.primary,
  },
  seeAllLink: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    color: colors.dark.text.brand,
  },
  categoriesCard: {
    padding: space[20],
    gap: 2,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  secondaryButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.dark.border.strong,
    backgroundColor: colors.dark.bg.surface,
  },
  secondaryButtonLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    color: colors.dark.text.primary,
  },
  sheetLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    color: colors.dark.text.secondary,
  },
  sheetChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[8],
  },
});
