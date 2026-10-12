// Futuro · Detalhe da assinatura — CONTEXTO.md §6.6. Nodes 31:676 (detalhe), 49:1212 (marcar uso)
// e 49:1245 (assinatura cancelada) no Figma.
//
// Próxima cobrança, cartão, assinante desde, pago no ano e último reajuste; passo a passo de como
// cancelar; "Já cancelei" (tira da previsão; se a cobrança voltar, vira alerta) e o selo que abre
// "Você usa esse serviço?". "Me lembrar 3 dias antes da cobrança" fica pra quando existir push
// (§6.9) — mostrar "Lembrete criado" sem lembrar de verdade iria contra o §1 (honestidade).
import { Avatar, Button, colors, EmptyState, radius, ScreenHeader, SecondaryButton, Sheet, Skeleton, space, typography } from '@planor/ui';
import { formatCents, monthNamePtBR } from '@planor/shared';
import { useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money } from '@/components/Money';
import { ScreenGlow } from '@/components/ScreenGlow';
import { USAGE_BADGE } from '@/features/assinaturas/labels';
import { useSubscriptionsQuery, useUpdateSubscriptionMutation } from '@/lib/api/queries';
import type { SubscriptionItem, SubscriptionUsage } from '@/lib/api/types';
import { dayMonthFromIso } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import { useHiddenValuesStore } from '@/lib/stores/useHiddenValuesStore';

const USAGE_OPTIONS: { usage: Exclude<SubscriptionUsage, 'unknown'>; title: string; caption: string }[] = [
  { usage: 'high', title: 'Uso com frequência', caption: 'Fica fora das sugestões de corte' },
  { usage: 'low', title: 'Uso pouco', caption: 'Fica marcada pra você reavaliar depois' },
  { usage: 'none', title: 'Não uso', caption: 'Entra nas sugestões de cancelamento' },
];

function saoPauloKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
}

/** ISO → "12 de novembro". */
function dayMonthLong(iso: string): string {
  const key = saoPauloKey(iso);
  return `${Number(key.slice(8, 10))} de ${monthNamePtBR(key.slice(0, 7))}`;
}

/** ISO → "agosto de 2025". */
function monthYearLong(iso: string): string {
  const key = saoPauloKey(iso);
  return `${monthNamePtBR(key.slice(0, 7))} de ${key.slice(0, 4)}`;
}

/** Último dia pra cancelar sem ser cobrado: a véspera da próxima cobrança, "11/11". */
function dayBefore(iso: string): string {
  return dayMonthFromIso(new Date(new Date(iso).getTime() - 24 * 60 * 60 * 1000).toISOString());
}

function DataRow({ label, children, last = false }: { label: string; children: ReactNode; last?: boolean }) {
  return (
    <View style={[styles.dataRow, last ? null : styles.dataRowBorder]}>
      <Text style={styles.dataLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Step({ n, children }: { n: number; children: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberLabel}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{children}</Text>
    </View>
  );
}

function Detail({ item, others }: { item: SubscriptionItem; others: SubscriptionItem[] }) {
  const { mutate: update, isPending } = useUpdateSubscriptionMutation(item.id);
  const hidden = useHiddenValuesStore((state) => state.hidden);
  const [usageVisible, setUsageVisible] = useState(false);
  const [cancelledVisible, setCancelledVisible] = useState(false);

  const cancelled = item.status === 'cancelled_by_user';
  const badge = cancelled
    ? { label: item.cancelledAt ? `Você cancelou em ${dayMonthFromIso(item.cancelledAt)}` : 'Você cancelou', bg: colors.dark.bg.elevated, text: colors.dark.text.secondary }
    : USAGE_BADGE[item.usage];
  const year = new Date().getFullYear();
  // Sugestão do Figma (49:1245): a próxima assinatura sem uso que ainda está ativa.
  const nextUnused = others.find((o) => o.id !== item.id && o.status === 'active' && o.usage === 'none');
  const money = (cents: number) => (hidden ? 'R$ ••••' : formatCents(cents));

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Assinatura" onBack={() => goBack('/futuro/assinaturas')} />

        <View style={styles.summary}>
          <Avatar initials={item.merchantName.charAt(0).toUpperCase()} size={64} />
          <Text style={styles.name}>{item.merchantName}</Text>
          <Money cents={item.amountCents} suffix="/mês" style={styles.amount} suffixStyle={styles.amount} />
          <Pressable
            style={[styles.badge, { backgroundColor: badge.bg }]}
            onPress={() => !cancelled && setUsageVisible(true)}
            disabled={cancelled}
            accessibilityRole="button"
            accessibilityLabel="Você usa esse serviço?"
          >
            <Text style={[styles.badgeLabel, { color: badge.text }]}>{badge.label}</Text>
          </Pressable>
        </View>

        <View style={styles.data}>
          <DataRow label="Próxima cobrança">
            <Text style={styles.dataValue}>
              {cancelled || !item.nextChargeAt
                ? '—'
                : new Date(item.nextChargeAt) < new Date()
                  ? `Atrasada (${dayMonthFromIso(item.nextChargeAt)})`
                  : dayMonthLong(item.nextChargeAt)}
            </Text>
          </DataRow>
          <DataRow label="Cartão">
            <Text style={styles.dataValue}>{item.bank ?? '—'}</Text>
          </DataRow>
          <DataRow label="Assinante desde">
            <Text style={styles.dataValue}>{item.since ? monthYearLong(item.since) : '—'}</Text>
          </DataRow>
          <DataRow label={`Pago em ${year}`} last={!item.priceChange}>
            <Money cents={item.paidThisYearCents} style={styles.dataValue} />
          </DataRow>
          {item.priceChange && (
            <DataRow label="Último reajuste" last>
              <Text style={[styles.dataValue, item.priceChange.pct > 0 ? styles.dataValueUp : null]}>
                {money(item.priceChange.fromCents)} → {money(item.priceChange.toCents)}
              </Text>
            </DataRow>
          )}
        </View>

        {!cancelled && (
          <View style={styles.howTo}>
            <Text style={styles.howToTitle}>Como cancelar</Text>
            <Step n={1}>Abra o app ou site do serviço e entre na sua conta.</Step>
            <Step n={2}>Procure por Conta ou Assinatura e escolha cancelar.</Step>
            <Step n={3}>
              {item.nextChargeAt
                ? `Cancele até ${dayBefore(item.nextChargeAt)} para não ser cobrado em ${monthNamePtBR(saoPauloKey(item.nextChargeAt).slice(0, 7))}.`
                : 'Cancele antes da próxima cobrança.'}
            </Step>
          </View>
        )}

        {cancelled ? (
          <SecondaryButton label="Ainda está ativa" icon="repetir" loading={isPending} onPress={() => update({ status: 'active' })} />
        ) : (
          <Button
            label="Já cancelei"
            loading={isPending}
            onPress={() => update({ status: 'cancelled_by_user' }, { onSuccess: () => setCancelledVisible(true) })}
          />
        )}
      </ScrollView>

      <Sheet visible={usageVisible} title="Você usa esse serviço?" subtitle="O banco não mostra uso — só você sabe." onClose={() => setUsageVisible(false)}>
        <View>
          {USAGE_OPTIONS.map((option) => (
            <Pressable
              key={option.usage}
              style={styles.option}
              onPress={() => update({ usage: option.usage }, { onSuccess: () => setUsageVisible(false) })}
              accessibilityRole="radio"
              accessibilityState={{ selected: item.usage === option.usage }}
            >
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionCaption}>{option.caption}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>

      <Sheet
        visible={cancelledVisible}
        title={`Boa, menos ${money(item.amountCents)} por mês`}
        subtitle={`Tiramos ${item.merchantName} da previsão.${
          item.nextChargeAt ? ` Se a cobrança de ${dayMonthFromIso(item.nextChargeAt)} aparecer mesmo assim, você vê um alerta aqui no app.` : ''
        }`}
        onClose={() => setCancelledVisible(false)}
      >
        {nextUnused && (
          <Text style={styles.optionCaption}>
            Falta {nextUnused.merchantName}, também sem uso: mais {money(nextUnused.amountCents)} por mês.
          </Text>
        )}
        <Button label="Entendi" onPress={() => setCancelledVisible(false)} />
      </Sheet>
    </View>
  );
}

export default function AssinaturaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, refetch } = useSubscriptionsQuery();

  if (isPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="Assinatura" onBack={() => goBack('/futuro/assinaturas')} />
          <Skeleton shape="bloco" width="100%" />
          <Skeleton shape="bloco" width="100%" />
        </View>
      </View>
    );
  }

  const item = data?.items.find((i) => i.id === id);

  if (isError || !item) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <EmptyState
          icon="aviso"
          title={isError ? 'Não deu pra carregar' : 'Assinatura não encontrada'}
          text={isError ? 'Confira sua internet e tenta de novo.' : 'Ela pode ter parado de cobrar.'}
          actionLabel={isError ? 'Tentar de novo' : 'Voltar'}
          onAction={() => (isError ? refetch() : goBack('/futuro/assinaturas'))}
        />
      </View>
    );
  }

  return <Detail item={item} others={data.items} />;
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
  summary: { alignItems: 'center', gap: space[6], paddingTop: space[4] },
  name: {
    fontFamily: typography.h3.fontFamily,
    fontSize: typography.h3.fontSize,
    lineHeight: typography.h3.lineHeight,
    letterSpacing: -0.09,
    color: colors.dark.text.primary,
    textAlign: 'center',
  },
  amount: {
    fontFamily: typography.display.fontFamily,
    fontSize: 32,
    lineHeight: 44,
    letterSpacing: -0.64,
    color: colors.dark.text.primary,
  },
  badge: { paddingHorizontal: space[10], paddingVertical: space[4], borderRadius: 10 },
  badgeLabel: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
  },
  data: {
    paddingHorizontal: space[20],
    paddingVertical: space[4],
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  dataRow: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dataRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.dark.border.default },
  dataLabel: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    lineHeight: typography.bodyMedium.lineHeight,
    color: colors.dark.text.secondary,
  },
  dataValue: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  dataValueUp: { color: colors.dark.text.error },
  howTo: {
    gap: space[10],
    padding: space[20],
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  howToTitle: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    lineHeight: typography.labelLarge.lineHeight,
    color: colors.dark.text.primary,
  },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: space[10] },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.elevated,
  },
  stepNumberLabel: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    color: colors.dark.text.brand,
  },
  stepText: {
    flex: 1,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
  option: { paddingVertical: space[14], borderBottomWidth: 1, borderBottomColor: colors.dark.border.default, gap: space[2] },
  optionTitle: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    lineHeight: typography.labelLarge.lineHeight,
    color: colors.dark.text.primary,
  },
  optionCaption: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
});
