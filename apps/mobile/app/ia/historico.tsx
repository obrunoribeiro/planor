// Planor IA · Histórico — CONTEXTO.md §6.7. Node 50:1127 no Figma.
//
// Cota do mês (só no Grátis), "Nova conversa" e as conversas em "Esta semana" e "Antes". Tocar
// abre a conversa na aba da IA. "Ver Pro" fica de fora até existir a assinatura (RevenueCat).
import {
  colors,
  EmptyState,
  gradients,
  Icon,
  radius,
  ScreenHeader,
  Skeleton,
  space,
  typography,
} from '@planor/ui';
import { monthNamePtBR } from '@planor/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenGlow } from '@/components/ScreenGlow';
import { useAiConversationsQuery, useAiUsageQuery } from '@/lib/api/queries';
import type { AiConversationListItem } from '@/lib/api/types';
import { alertTimeLabel, dayGroupLabel, saoPauloDateKey } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import { useMaskedMoneyText } from '@/lib/useMaskedMoneyText';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function whenLabel(iso: string): string {
  const group = dayGroupLabel(saoPauloDateKey(new Date(iso)));
  return group === 'Hoje' || group === 'Ontem' ? group : alertTimeLabel(iso);
}

function Section({ title, items }: { title: string; items: AiConversationListItem[] }) {
  const mask = useMaskedMoneyText();
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.list}>
        {items.map((item, index) => (
          <Pressable
            key={item.id}
            style={[styles.row, index === items.length - 1 ? null : styles.rowBorder]}
            onPress={() =>
              router.navigate({ pathname: '/ia', params: { conversationId: item.id } })
            }
            accessibilityRole="button"
          >
            <View style={styles.rowIcon}>
              <Icon name="chat" size={18} color={colors.dark.text.brand} />
            </View>
            <View style={styles.rowTexts}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {item.preview ? (
                <Text style={styles.rowPreview} numberOfLines={2}>
                  {mask(item.preview)}
                </Text>
              ) : null}
            </View>
            <Text style={styles.rowWhen}>{whenLabel(item.lastMessageAt)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function HistoricoScreen() {
  const { data, isPending, isError, refetch } = useAiConversationsQuery();
  const { data: usage } = useAiUsageQuery();

  if (isPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="Conversas" onBack={() => goBack('/ia')} />
          <Skeleton shape="bloco" width="100%" />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <EmptyState
          icon="aviso"
          title="Não deu pra carregar"
          text="Confira sua internet e tenta de novo."
          actionLabel="Tentar de novo"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  const now = Date.now();
  const thisWeek = data.filter((c) => now - new Date(c.lastMessageAt).getTime() < WEEK_MS);
  const before = data.filter((c) => now - new Date(c.lastMessageAt).getTime() >= WEEK_MS);
  const nextMonth = usage
    ? monthNamePtBR(
        usage.month.endsWith('-12')
          ? `${Number(usage.month.slice(0, 4)) + 1}-01`
          : `${usage.month.slice(0, 4)}-${String(Number(usage.month.slice(5, 7)) + 1).padStart(2, '0')}`,
      )
    : null;

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Conversas" onBack={() => goBack('/ia')} />

        {usage?.limit != null && (
          <View style={styles.usage}>
            <Text style={styles.usageTitle}>
              {usage.used} de {usage.limit} perguntas em {monthNamePtBR(usage.month)}
            </Text>
            <View style={styles.track}>
              <LinearGradient
                colors={gradients.progresso.colors}
                start={gradients.progresso.start}
                end={gradients.progresso.end}
                style={[
                  styles.fill,
                  { width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.usageCaption}>Renova em 1º de {nextMonth}.</Text>
          </View>
        )}

        <Pressable
          onPress={() => router.navigate({ pathname: '/ia', params: { nova: String(Date.now()) } })}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={gradients.botao.colors}
            start={gradients.botao.start}
            end={gradients.botao.end}
            style={styles.newButton}
          >
            <Icon name="mais" size={18} color={colors.dark.text.onBrand} />
            <Text style={styles.newLabel}>Nova conversa</Text>
          </LinearGradient>
        </Pressable>

        {data.length === 0 ? (
          <EmptyState
            icon="chat"
            title="Nenhuma conversa ainda"
            text="Pergunte qualquer coisa sobre seu dinheiro: as conversas ficam guardadas aqui."
          />
        ) : (
          <>
            <Section title="Esta semana" items={thisWeek} />
            <Section title="Antes" items={before} />
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
  usage: {
    gap: space[10],
    padding: space[16],
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  usageTitle: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  track: {
    height: 6,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.dark.border.strong,
  },
  fill: { height: '100%', borderRadius: 4 },
  usageCaption: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  newButton: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[10],
  },
  newLabel: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    lineHeight: typography.labelLarge.lineHeight,
    color: colors.dark.text.onBrand,
  },
  section: { gap: space[8] },
  sectionTitle: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
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
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[14] },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.dark.border.default },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.brandSubtle,
  },
  rowTexts: { flex: 1, gap: space[2] },
  rowTitle: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  rowPreview: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  rowWhen: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
});
