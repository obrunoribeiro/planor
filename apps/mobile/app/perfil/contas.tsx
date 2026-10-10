// Perfil · Contas e cartões — CONTEXTO.md §6.10 ("lista por banco, com saldo da conta e fatura do
// cartão; Reconectar quando o consentimento venceu; Conectar outro banco") e §6.2. Node 34:785
// no Figma. Conexões desconectadas não aparecem (o histórico importado continua no app, só não
// atualiza — §6.2).
import { Button, colors, EmptyState, Icon, radius, ScreenHeader, Skeleton, space, typography } from '@planor/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money } from '@/components/Money';
import { BankAvatar, connectionUiState, expiresInLabel, ScreenGlow } from '@/features/contas/shared';
import { SyncFailedSheet } from '@/features/contas/SyncFailedSheet';
import { useConnectionsQuery, useRefreshConnectionMutation } from '@/lib/api/queries';
import type { ConnectionAccount, ConnectionListItem } from '@/lib/api/types';
import { dayMonthFromIso, monthYearShortFromIso, relativeTimeLabel } from '@/lib/format';

const ACCOUNT_LABEL: Record<ConnectionAccount['type'], { title: string; caption: string }> = {
  checking: { title: 'Conta corrente', caption: 'Saldo' },
  savings: { title: 'Poupança', caption: 'Saldo' },
  credit_card: { title: 'Cartão de crédito', caption: 'Fatura atual' },
};

function AccountRow({ account }: { account: ConnectionAccount }) {
  const label = ACCOUNT_LABEL[account.type];
  return (
    <View style={styles.accountRow}>
      <View>
        <Text style={styles.accountTitle}>{label.title}</Text>
        <Text style={styles.caption}>{label.caption}</Text>
      </View>
      <Money style={styles.accountValue} cents={account.balanceCents} />
    </View>
  );
}

function ConnectionCard({ connection, onSyncFailed }: { connection: ConnectionListItem; onSyncFailed: () => void }) {
  const state = connectionUiState(connection);

  if (state === 'expired') {
    return (
      <View style={[styles.card, styles.cardExpired]}>
        <View style={styles.cardTop}>
          <BankAvatar name={connection.institutionName} />
          <View style={styles.cardTexts}>
            <Text style={styles.bankName}>{connection.institutionName}</Text>
            <Text style={[styles.caption, styles.captionError]}>
              {connection.consentExpiresAt ? `Acesso expirou em ${dayMonthFromIso(connection.consentExpiresAt)}` : 'Acesso expirou'}
            </Text>
          </View>
        </View>
        <Text style={styles.body}>
          O consentimento do Open Finance vence a cada 12 meses. Reconecte para voltar a ver os dados desse banco.
        </Text>
        <Pressable
          style={styles.reconnect}
          accessibilityRole="button"
          onPress={() => router.push(`/perfil/renovar/${connection.id}`)}
        >
          <Text style={styles.reconnectLabel}>Reconectar {connection.institutionName}</Text>
        </Pressable>
      </View>
    );
  }

  const subtitle =
    state === 'error'
      ? 'Não conseguimos atualizar'
      : state === 'expiring'
        ? expiresInLabel(connection.consentDaysLeft!)
        : connection.consentExpiresAt
          ? `Conectado · renova em ${monthYearShortFromIso(connection.consentExpiresAt)}`
          : 'Conectado';

  const onPress = () => {
    if (state === 'error') onSyncFailed();
    else if (state === 'expiring') router.push(`/perfil/acesso-vencendo/${connection.id}`);
    else router.push(`/perfil/conexao/${connection.id}`);
  };

  return (
    <View style={styles.card}>
      <Pressable style={styles.cardTop} onPress={onPress} accessibilityRole="button">
        <BankAvatar name={connection.institutionName} />
        <View style={styles.cardTexts}>
          <Text style={styles.bankName}>{connection.institutionName}</Text>
          <Text style={[styles.caption, state === 'error' && styles.captionError, state === 'expiring' && styles.captionAlert]}>
            {subtitle}
          </Text>
        </View>
        <Icon name="seta-direita" size={18} color={colors.dark.text.tertiary} />
      </Pressable>
      {connection.accounts.map((account) => (
        <AccountRow key={account.id} account={account} />
      ))}
    </View>
  );
}

export default function ContasScreen() {
  const { data: connections, isPending, isError, refetch } = useConnectionsQuery();
  const { mutate: refresh, isPending: isRefreshing } = useRefreshConnectionMutation();
  const [failedId, setFailedId] = useState<string | null>(null);

  const header = (
    <ScreenHeader
      title="Contas e cartões"
      onBack={() => router.back()}
      action={
        <Pressable style={styles.headerAction} onPress={() => router.push('/perfil/conectar-banco')} accessibilityLabel="Conectar outro banco">
          <Icon name="mais" size={20} color={colors.dark.text.primary} />
        </Pressable>
      }
    />
  );

  if (isPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          {header}
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

  const visible = connections.filter((c) => c.status !== 'disconnected');

  if (visible.length === 0) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          {header}
          <EmptyState
            icon="banco"
            title="Nenhum banco conectado"
            text="Conecte seu banco pelo Open Finance pra ver saldo, faturas e gastos aqui."
            actionLabel="Conectar banco"
            onAction={() => router.push('/perfil/conectar-banco')}
          />
        </View>
      </View>
    );
  }

  const active = visible.filter((c) => connectionUiState(c) !== 'expired');
  const lastSync = active
    .map((c) => c.lastSyncAt)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);
  const failed = visible.find((c) => c.id === failedId);

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView contentContainerStyle={styles.content}>
        {header}
        <View style={styles.status}>
          <View style={[styles.statusDot, active.length === 0 && styles.statusDotOff]} />
          <Text style={styles.statusText}>
            {active.length} {active.length === 1 ? 'conexão ativa' : 'conexões ativas'}
            {lastSync ? ` · atualizado ${relativeTimeLabel(lastSync)}` : ''}
          </Text>
        </View>
        {visible.map((connection) => (
          <ConnectionCard key={connection.id} connection={connection} onSyncFailed={() => setFailedId(connection.id)} />
        ))}
        <Button label="Conectar outro banco" onPress={() => router.push('/perfil/conectar-banco')} />
      </ScrollView>
      <SyncFailedSheet
        visible={!!failed}
        institutionName={failed?.institutionName ?? ''}
        lastSyncAt={failed?.lastSyncAt ?? null}
        retrying={isRefreshing}
        onRetry={() => failed && refresh(failed.id, { onSettled: () => setFailedId(null) })}
        onClose={() => setFailedId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[24] },
  content: { paddingTop: space[60], paddingHorizontal: space[24], paddingBottom: space[40], gap: space[20] },
  headerAction: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.dark.bg.surface,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dark.text.success },
  statusDotOff: { backgroundColor: colors.dark.text.tertiary },
  statusText: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
  card: {
    backgroundColor: colors.dark.bg.surface,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    borderRadius: radius['3xl'],
    padding: space[16],
    gap: space[12],
  },
  // Borda do Figma: rgba(240, 68, 82, 0.5) = icon.error a 50%.
  cardExpired: { borderColor: `${colors.dark.icon.error}80` },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  cardTexts: { flex: 1, gap: space[2] },
  bankName: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    lineHeight: typography.labelLarge.lineHeight,
    color: colors.dark.text.primary,
  },
  caption: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  captionError: { color: colors.dark.text.error },
  captionAlert: { color: colors.dark.text.alert },
  body: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.dark.bg.sunken,
    borderRadius: radius.lg,
    paddingHorizontal: space[12],
    paddingVertical: space[10],
  },
  accountTitle: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  accountValue: {
    fontFamily: typography.numberSmall.fontFamily,
    fontSize: typography.numberSmall.fontSize,
    lineHeight: typography.numberSmall.lineHeight,
    color: colors.dark.text.primary,
  },
  reconnect: {
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.dark.bg.errorSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reconnectLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.error,
  },
});
