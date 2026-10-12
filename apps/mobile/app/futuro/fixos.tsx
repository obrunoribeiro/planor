// Futuro · Fixos recorrentes — CONTEXTO.md §6.6. Node 48:1034 no Figma.
//
// Contas que se repetem todo mês: as detectadas nas transações (as que variam, como energia, são
// estimadas pela média de 3 meses) e as cadastradas à mão em "Nova conta fixa". Tocar numa
// cadastrada à mão oferece remover; as detectadas saem sozinhas quando param de cobrar.
import { colors, Dialog, EmptyState, gradients, Icon, radius, ScreenHeader, SecondaryButton, Skeleton, space, typography } from '@planor/ui';
import { monthNamePtBR } from '@planor/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money } from '@/components/Money';
import { ScreenGlow } from '@/components/ScreenGlow';
import { NovaContaFixaSheet } from '@/features/fixos/NovaContaFixaSheet';
import { useDeleteFixedBillMutation, useFixedBillsQuery } from '@/lib/api/queries';
import type { FixedBillItem } from '@/lib/api/types';
import { goBack } from '@/lib/navigation';

function caption(item: FixedBillItem): string {
  const day = item.day ? `todo dia ${String(item.day).padStart(2, '0')}` : 'todo mês';
  return item.paidWith ? `${item.paidWith} · ${day}` : day;
}

export default function FixosScreen() {
  const { data, isPending, isError, refetch } = useFixedBillsQuery();
  const { mutate: remove } = useDeleteFixedBillMutation();
  const [addVisible, setAddVisible] = useState(false);
  const [toRemove, setToRemove] = useState<FixedBillItem | null>(null);

  if (isPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="Fixos recorrentes" onBack={() => goBack('/futuro')} />
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

  const estimated = data.items.filter((i) => i.estimated);
  const count = data.items.length;

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Fixos recorrentes" onBack={() => goBack('/futuro')} />

        {count === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="repetir"
              title="Nenhuma conta fixa ainda"
              text="Condomínio, internet, energia… As que vierem no banco aparecem aqui sozinhas. Você também pode adicionar uma."
            />
          </View>
        ) : (
          <>
            <LinearGradient
              colors={gradients.cardDestaque.colors}
              start={gradients.cardDestaque.start}
              end={gradients.cardDestaque.end}
              style={styles.summary}
            >
              <Text style={styles.summaryLabel}>Em {monthNamePtBR(data.nextMonth)}</Text>
              <Money cents={data.monthlyCents} style={styles.summaryAmount} />
              <Text style={styles.summaryText}>
                {count === 1
                  ? '1 conta que se repete todo mês, já prevista no comprometido.'
                  : `${count} contas que se repetem todo mês, já previstas no comprometido.`}
              </Text>
            </LinearGradient>

            <View style={styles.list}>
              {data.items.map((item, index) => (
                <Pressable
                  key={item.id}
                  style={[styles.row, index === count - 1 ? null : styles.rowBorder]}
                  onPress={() => item.source === 'manual' && setToRemove(item)}
                  disabled={item.source !== 'manual'}
                  accessibilityRole={item.source === 'manual' ? 'button' : undefined}
                >
                  <View style={styles.rowIcon}>
                    <Icon name="repetir" size={20} color={colors.dark.text.brand} />
                  </View>
                  <View style={styles.rowTexts}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.rowCaption}>{caption(item)}</Text>
                  </View>
                  <View style={styles.rowValue}>
                    <Money cents={item.amountCents} style={styles.rowAmount} />
                    {item.estimated && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeLabel}>estimado</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>

            {estimated.length > 0 && (
              <View style={styles.notice}>
                <Icon name="aviso" size={20} color={colors.dark.text.brand} />
                <Text style={styles.noticeText}>
                  {estimated.length === 1 ? `${estimated[0]!.name} varia` : 'Algumas contas variam'} todo mês. Usamos a média dos últimos 3
                  meses até a conta chegar.
                </Text>
              </View>
            )}
          </>
        )}

        <View style={styles.spacer} />

        <SecondaryButton label="Adicionar conta fixa" icon="mais" onPress={() => setAddVisible(true)} />
      </ScrollView>

      <NovaContaFixaSheet visible={addVisible} onClose={() => setAddVisible(false)} />

      <Dialog
        visible={toRemove !== null}
        tone="erro"
        title={`Remover ${toRemove?.name ?? 'conta fixa'}?`}
        text="Ela sai dos fixos e do comprometido dos próximos meses."
        confirmLabel="Remover"
        onConfirm={() => {
          if (toRemove) remove(toRemove.id);
          setToRemove(null);
        }}
        onCancel={() => setToRemove(null)}
      />
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
  emptyWrap: { paddingTop: space[40] },
  summary: {
    gap: space[6],
    padding: space[20],
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.5)',
  },
  summaryLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.secondary,
  },
  summaryAmount: {
    fontFamily: typography.numberLarge.fontFamily,
    fontSize: typography.numberLarge.fontSize,
    lineHeight: typography.numberLarge.lineHeight,
    letterSpacing: -0.24,
    color: colors.dark.text.primary,
  },
  summaryText: {
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
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12.8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.brandSubtle,
  },
  rowTexts: { flex: 1, gap: space[2] },
  rowName: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  rowCaption: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  rowValue: { alignItems: 'flex-end', gap: space[2] },
  rowAmount: {
    fontFamily: typography.numberSmall.fontFamily,
    fontSize: typography.numberSmall.fontSize,
    lineHeight: typography.numberSmall.lineHeight,
    color: colors.dark.text.primary,
  },
  badge: { paddingHorizontal: space[10], paddingVertical: space[4], borderRadius: 10, backgroundColor: colors.dark.bg.alertSubtle },
  badgeLabel: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.dark.text.alert,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[12],
    paddingHorizontal: space[16],
    paddingVertical: space[14],
    borderRadius: radius['2xl'],
    backgroundColor: colors.dark.bg.brandSubtle,
  },
  noticeText: {
    flex: 1,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
  spacer: { flex: 1 },
});
