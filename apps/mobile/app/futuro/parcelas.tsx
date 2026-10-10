// Futuro · Parcelas — CONTEXTO.md §6.6. Node 30:592 no Figma.
//
// Resumo (por mês, falta pagar, quando termina o último) e a lista com barra de progresso, como
// "3 de 10 · Nubank · termina em jul/27 · falta R$ 1.680,00". Tocar abre o detalhe.
import { colors, EmptyState, gradients, radius, ScreenHeader, Skeleton, space, typography } from '@planor/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money } from '@/components/Money';
import { ScreenGlow } from '@/components/ScreenGlow';
import { useInstallmentsQuery } from '@/lib/api/queries';
import type { InstallmentPlanItem } from '@/lib/api/types';
import { monthYearShortLabel } from '@/lib/format';
import { goBack } from '@/lib/navigation';

function PlanCard({ plan }: { plan: InstallmentPlanItem }) {
  const percent = (plan.current / plan.count) * 100;
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: '/futuro/parcela/[id]', params: { id: plan.id } })}
      accessibilityRole="button"
    >
      <View style={styles.line}>
        <Text style={styles.name} numberOfLines={1}>
          {plan.merchantName}
        </Text>
        <Money cents={plan.installmentCents} suffix="/mês" style={styles.monthly} suffixStyle={styles.monthly} />
      </View>
      <View style={styles.track}>
        <LinearGradient
          colors={gradients.progresso.colors}
          start={gradients.progresso.start}
          end={gradients.progresso.end}
          style={[styles.fill, { width: `${percent}%` }]}
        />
      </View>
      <View style={styles.line}>
        <Text style={[styles.caption, styles.captionMain]}>
          {plan.current} de {plan.count} · {plan.bank} · termina em {monthYearShortLabel(`${plan.lastMonth}-01`)}
        </Text>
        {plan.remainingCents > 0 ? (
          <Text style={styles.caption}>
            falta <Money cents={plan.remainingCents} style={styles.caption} />
          </Text>
        ) : (
          <Text style={styles.caption}>última parcela</Text>
        )}
      </View>
    </Pressable>
  );
}

export default function ParcelasScreen() {
  const { data, isPending, isError, refetch } = useInstallmentsQuery();

  if (isPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="Parcelas" onBack={() => goBack('/futuro')} />
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

  const count = data.plans.length;

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Parcelas" onBack={() => goBack('/futuro')} />

        {count === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="parcelas"
              title="Nenhum parcelamento ativo"
              text="Quando uma compra parcelada aparecer no seu cartão, ela entra aqui com quanto falta pagar."
            />
          </View>
        ) : (
          <>
            <LinearGradient
              colors={gradients.resumoParcelas.colors}
              locations={gradients.resumoParcelas.locations}
              start={gradients.resumoParcelas.start}
              end={gradients.resumoParcelas.end}
              style={styles.summary}
            >
              <View style={styles.summaryValues}>
                <View style={styles.summaryValue}>
                  <Text style={styles.summaryLabel}>Por mês</Text>
                  <Money cents={data.monthlyCents} style={styles.summaryAmount} />
                </View>
                <View style={styles.summaryValue}>
                  <Text style={styles.summaryLabel}>Falta pagar</Text>
                  <Money cents={data.remainingCents} style={styles.summaryAmount} />
                </View>
              </View>
              <Text style={styles.caption}>
                {count === 1 ? '1 parcelamento ativo' : `${count} parcelamentos ativos`}
                {data.lastMonth ? ` · o último termina em ${monthYearShortLabel(`${data.lastMonth}-01`)}` : ''}
              </Text>
            </LinearGradient>

            {data.plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </>
        )}
      </ScrollView>
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
  summary: {
    gap: space[14],
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
  card: {
    gap: space[10],
    padding: space[16],
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space[8] },
  name: {
    flex: 1,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    lineHeight: typography.labelLarge.lineHeight,
    color: colors.dark.text.primary,
  },
  monthly: {
    fontFamily: typography.numberSmall.fontFamily,
    fontSize: typography.numberSmall.fontSize,
    lineHeight: typography.numberSmall.lineHeight,
    color: colors.dark.text.primary,
  },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.dark.border.strong },
  fill: { height: '100%', borderRadius: 4 },
  captionMain: { flex: 1 },
  caption: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
});
