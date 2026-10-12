// Central de alertas — CONTEXTO.md §6.9. Node 34:857 no Figma.
//
// Grupos por dia (Hoje, Ontem, depois a data), chips Todos / Não lidos / Importantes e "Marcar
// todos como lidos" no botão do topo. Tocar num alerta marca como lido e abre o destino. Os
// valores no texto obedecem ao olho (useMaskedMoneyText).
import {
  Chip,
  colors,
  EmptyState,
  Icon,
  type IconName,
  radius,
  ScreenHeader,
  Skeleton,
  space,
  typography,
} from '@planor/ui';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenGlow } from '@/components/ScreenGlow';
import { useAlertsQuery, useMarkAlertsReadMutation } from '@/lib/api/queries';
import type { AlertItem } from '@/lib/api/types';
import { alertTimeLabel, dayGroupLabel, saoPauloDateKey } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import { useMaskedMoneyText } from '@/lib/useMaskedMoneyText';

type Filter = 'Todos' | 'Não lidos' | 'Importantes';
const FILTERS: Filter[] = ['Todos', 'Não lidos', 'Importantes'];

const TONE = {
  brand: { bg: colors.dark.bg.brandSubtle, fg: colors.dark.text.brand },
  alert: { bg: colors.dark.bg.alertSubtle, fg: colors.dark.text.alert },
  error: { bg: colors.dark.bg.errorSubtle, fg: colors.dark.text.error },
  success: { bg: colors.dark.bg.successSubtle, fg: colors.dark.text.success },
} as const;

function AlertRow({ alert, onPress }: { alert: AlertItem; onPress: () => void }) {
  const mask = useMaskedMoneyText();
  const tone = TONE[alert.tone];
  return (
    <Pressable
      style={styles.item}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !alert.read }}
    >
      <View style={[styles.itemIcon, { backgroundColor: tone.bg }]}>
        <Icon name={alert.icon as IconName} size={20} color={tone.fg} />
      </View>
      <View style={styles.itemTexts}>
        <View style={styles.itemTop}>
          <Text style={styles.itemTitle}>{alert.title}</Text>
          <Text style={styles.itemTime}>{alertTimeLabel(alert.createdAt)}</Text>
          {!alert.read && <View style={styles.unreadDot} />}
        </View>
        {alert.body ? <Text style={styles.itemBody}>{mask(alert.body)}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function AlertasScreen() {
  const { data, isPending, isError, refetch } = useAlertsQuery();
  const { mutate: markRead } = useMarkAlertsReadMutation();
  const [filter, setFilter] = useState<Filter>('Todos');

  if (isPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="Alertas" onBack={() => goBack('/')} />
          <Skeleton shape="bloco" width="100%" />
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

  const visible = data.items.filter((a) =>
    filter === 'Não lidos' ? !a.read : filter === 'Importantes' ? a.important : true,
  );
  const groups: { label: string; items: AlertItem[] }[] = [];
  for (const alert of visible) {
    const label = dayGroupLabel(saoPauloDateKey(new Date(alert.createdAt)));
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(alert);
    else groups.push({ label, items: [alert] });
  }

  const open = (alert: AlertItem) => {
    if (!alert.read) markRead([alert.id]);
    if (alert.route) router.push(alert.route as Href);
  };

  const markAllButton =
    data.unreadCount > 0 ? (
      <Pressable
        style={styles.headerButton}
        onPress={() => markRead(undefined)}
        accessibilityLabel="Marcar todos como lidos"
      >
        <Icon name="check" size={20} color={colors.dark.text.primary} />
      </Pressable>
    ) : undefined;

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Alertas" onBack={() => goBack('/')} action={markAllButton} />

        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <Chip key={f} label={f} active={f === filter} onPress={() => setFilter(f)} />
          ))}
        </View>

        {groups.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="sino"
              title={
                filter === 'Todos'
                  ? 'Nenhum alerta por aqui'
                  : filter === 'Não lidos'
                    ? 'Tudo lido'
                    : 'Nada importante agora'
              }
              text="Avisamos quando um gasto sair do padrão, uma assinatura subir ou a fatura estiver perto de fechar."
            />
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              {group.items.map((alert) => (
                <AlertRow key={alert.id} alert={alert} onPress={() => open(alert)} />
              ))}
            </View>
          ))
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
    gap: space[16],
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
  filters: { flexDirection: 'row', gap: space[8] },
  group: { gap: space[16] },
  groupLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.secondary,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[12],
    paddingHorizontal: space[16],
    paddingVertical: space[14],
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTexts: { flex: 1, gap: space[2] },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  itemTitle: {
    flex: 1,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  itemTime: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dark.border.brand },
  itemBody: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
});
