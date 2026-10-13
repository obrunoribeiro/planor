// Futuro · Fatura do cartão — CONTEXTO.md §6.6. Node 48:1147 no Figma.
//
// Total, datas de fechamento e vencimento, e a quebra por parcelas, assinaturas e fixos. Aberta
// pelo card de fatura do Futuro (`id` = conta do cartão); mostra a fatura que o usuário tem que
// pagar a seguir. Além do Figma: "Outras compras" (compras avulsas, que numa fatura real são a
// maior parte) e "Ainda não detalhado" (o que o banco cobrou mas não mandou uma a uma) — sem eles a
// soma das seções não bateria com o total.
import { colors, EmptyState, gradients, Icon, type IconName, radius, ScreenHeader, SecondaryButton, Skeleton, space, typography } from '@planor/ui';
import { monthNamePtBR } from '@planor/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money } from '@/components/Money';
import { ScreenGlow } from '@/components/ScreenGlow';
import { BankAvatar } from '@/features/contas/shared';
import { useCardStatementQuery } from '@/lib/api/queries';
import type { CardStatementResponse } from '@/lib/api/types';
import { goBack } from '@/lib/navigation';

/** "2026-11-11" → "11/11". */
function dayMonth(dateKey: string): string {
  return `${dateKey.slice(8, 10)}/${dateKey.slice(5, 7)}`;
}

function todayKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function summaryLabel(data: CardStatementResponse): string {
  if (data.kind === 'closed') return data.paid ? 'Fatura paga' : 'Fatura fechada';
  return 'Já comprometido';
}

function Section({ icon, title, amountCents, children }: { icon: IconName; title: string; amountCents: number; children?: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Icon name={icon} size={18} color={colors.dark.text.brand} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Money cents={amountCents} style={styles.sectionAmount} />
      </View>
      {children}
    </View>
  );
}

function Line({ title, caption, amountCents }: { title: string; caption?: string; amountCents?: number }) {
  return (
    <View style={styles.line}>
      <View style={styles.lineTexts}>
        <Text style={styles.lineTitle} numberOfLines={amountCents === undefined ? undefined : 1}>
          {title}
        </Text>
        {caption ? <Text style={styles.lineCaption}>{caption}</Text> : null}
      </View>
      {amountCents !== undefined && <Money cents={amountCents} style={styles.lineAmount} />}
    </View>
  );
}

export default function FaturaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, refetch } = useCardStatementQuery(id);

  if (isPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="Fatura" onBack={() => goBack('/futuro')} />
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

  const title = `Fatura de ${monthNamePtBR(data.month)}`;
  const { installments, subscriptions, bills, otherPurchases } = data;
  const stillOpen = data.kind !== 'closed' && data.closingDate >= todayKey();

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={title} onBack={() => goBack('/futuro')} />

        <LinearGradient
          colors={gradients.cardDestaque.colors}
          start={gradients.cardDestaque.start}
          end={gradients.cardDestaque.end}
          style={styles.summary}
        >
          <View style={styles.bank}>
            <BankAvatar name={data.bank} size={36} />
            <Text style={styles.bankName}>Cartão {data.bank}</Text>
          </View>
          <View style={styles.value}>
            <Text style={styles.valueLabel}>{summaryLabel(data)}</Text>
            <Money cents={data.totalCents} style={styles.valueAmount} />
          </View>
          <View style={styles.dates}>
            <View style={styles.datePill}>
              <Text style={styles.dateLabel}>{data.kind === 'closed' ? 'Fechou' : 'Fecha'}</Text>
              <Text style={styles.dateValue}>{dayMonth(data.closingDate)}</Text>
            </View>
            <View style={styles.datePill}>
              <Text style={styles.dateLabel}>Vence</Text>
              <Text style={styles.dateValue}>{dayMonth(data.dueDate)}</Text>
            </View>
          </View>
        </LinearGradient>

        {data.totalCents === 0 ? (
          <EmptyState icon="cartao" title="Nada nesta fatura ainda" text="As compras no cartão aparecem aqui conforme o banco manda." />
        ) : (
          <>
            {installments.totalCents > 0 && (
              <Section icon="parcelas" title="Parcelas" amountCents={installments.totalCents}>
                {installments.items.map((item, index) => (
                  <Line
                    key={`${item.name}-${index}`}
                    title={item.name}
                    caption={item.number && item.count ? `parcela ${item.number} de ${item.count}` : undefined}
                    amountCents={item.amountCents}
                  />
                ))}
              </Section>
            )}

            {subscriptions.totalCents > 0 && (
              <Section icon="assinaturas" title="Assinaturas" amountCents={subscriptions.totalCents}>
                <Line
                  title={subscriptions.count === 1 ? '1 assinatura' : `${subscriptions.count} assinaturas`}
                  caption={
                    subscriptions.unusedCount === 0
                      ? undefined
                      : subscriptions.unusedCount === 1
                        ? '1 marcada sem uso'
                        : `${subscriptions.unusedCount} marcadas sem uso`
                  }
                  amountCents={subscriptions.totalCents}
                />
              </Section>
            )}

            {bills.totalCents > 0 && (
              <Section icon="repetir" title="Fixos recorrentes" amountCents={bills.totalCents}>
                {bills.items.map((item, index) => (
                  <Line key={`${item.name}-${index}`} title={item.name} amountCents={item.amountCents} />
                ))}
              </Section>
            )}

            {otherPurchases.totalCents > 0 && (
              <Section icon="sacola" title="Outras compras" amountCents={otherPurchases.totalCents}>
                <Line title={otherPurchases.count === 1 ? '1 compra' : `${otherPurchases.count} compras`} />
              </Section>
            )}

            {data.undetailedCents > 0 && (
              <Section icon="aviso" title="Ainda não detalhado" amountCents={data.undetailedCents}>
                <Line title="O banco já cobrou, mas ainda não mandou essas compras uma a uma." />
              </Section>
            )}
          </>
        )}

        {stillOpen && <Text style={styles.note}>Compras novas até {dayMonth(data.closingDate)} também entram nesta fatura.</Text>}

        <View style={styles.spacer} />

        <SecondaryButton
          label="Ver transações do cartão"
          icon="gastos"
          onPress={() => router.push({ pathname: '/gastos/transacoes', params: { accountId: data.accountId } })}
        />
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
  summary: {
    gap: space[14],
    padding: space[20],
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.5)',
  },
  bank: { flexDirection: 'row', alignItems: 'center', gap: space[10] },
  bankName: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  value: { gap: space[2] },
  valueLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.secondary,
  },
  valueAmount: {
    fontFamily: typography.numberXl.fontFamily,
    fontSize: typography.numberXl.fontSize,
    lineHeight: typography.numberXl.lineHeight,
    letterSpacing: -0.72,
    color: colors.dark.text.primary,
  },
  dates: { flexDirection: 'row', gap: space[8] },
  datePill: {
    flexDirection: 'row',
    gap: space[4],
    paddingHorizontal: space[10],
    paddingVertical: space[6],
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dateLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.secondary,
  },
  dateValue: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.primary,
  },
  section: {
    paddingHorizontal: space[16],
    paddingTop: space[4],
    paddingBottom: space[8],
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingTop: space[12], paddingBottom: space[8] },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 11.52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.brandSubtle,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    lineHeight: typography.labelLarge.lineHeight,
    color: colors.dark.text.primary,
  },
  sectionAmount: {
    fontFamily: typography.numberSmall.fontFamily,
    fontSize: typography.numberSmall.fontSize,
    lineHeight: typography.numberSmall.lineHeight,
    color: colors.dark.text.primary,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: space[8], paddingLeft: space[48], paddingVertical: space[8] },
  lineTexts: { flex: 1 },
  lineTitle: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    lineHeight: typography.bodyMedium.lineHeight,
    color: colors.dark.text.secondary,
  },
  lineCaption: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  lineAmount: {
    fontFamily: typography.numberSmall.fontFamily,
    fontSize: typography.numberSmall.fontSize,
    lineHeight: typography.numberSmall.lineHeight,
    color: colors.dark.text.secondary,
  },
  note: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  spacer: { flex: 1 },
});
