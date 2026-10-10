// Perfil · Contas e cartões — CONTEXTO.md §6.10. Node 34:785 no Figma.
//
// Lista por banco, com saldo da conta e fatura do cartão; "Reconectar" quando o consentimento
// venceu; "Conectar outro banco". Tocar no banco abre o Detalhe da conexão.
import { Button, colors, EmptyState, GlowOrb, Icon, radius, ScreenHeader, Skeleton, space, typography } from '@planor/ui';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money } from '@/components/Money';
import { accountLabel, bankInitials, connectionStatusLabel, lastSyncLabel } from '@/features/contas/connectionLabels';
import { useConnectionsQuery } from '@/lib/api/queries';
import type { ConnectionListItem } from '@/lib/api/types';

function Glow() {
  return (
    <View style={styles.glow} pointerEvents="none">
      <GlowOrb
        width={520}
        height={420}
        color="#7C5CFF"
        stops={[
          { offset: 0, opacity: 0.35 },
          { offset: 0.55, opacity: 0.1225 },
          { offset: 1, opacity: 0 },
        ]}
      />
    </View>
  );
}

function AddButton() {
  return (
    <Pressable style={styles.addButton} onPress={() => router.push('/perfil/conectar-banco')} accessibilityLabel="Conectar outro banco">
      <Icon name="mais" size={20} color={colors.dark.text.primary} />
    </Pressable>
  );
}

function ConnectionCard({ connection }: { connection: ConnectionListItem }) {
  const expired = connection.status === 'consent_expired';
  const problem = expired || connection.status === 'error';
  const showAccounts = connection.status !== 'disconnected' && !expired;

  return (
    <View style={[styles.card, expired ? styles.cardExpired : null]}>
      <Pressable
        style={styles.cardTop}
        onPress={() => router.push({ pathname: '/perfil/conexao/[id]', params: { id: connection.id } })}
        accessibilityRole="button"
      >
        <View style={styles.bankAvatar}>
          <Text style={styles.bankAvatarLabel}>{bankInitials(connection.institutionName)}</Text>
        </View>
        <View style={styles.cardTexts}>
          <Text style={styles.bankName}>{connection.institutionName}</Text>
          <Text style={[styles.bankStatus, problem ? styles.bankStatusError : null]}>{connectionStatusLabel(connection)}</Text>
        </View>
        <Icon name="seta-direita" size={18} color={colors.dark.text.tertiary} />
      </Pressable>

      {showAccounts &&
        connection.accounts.map((account) => {
          const label = accountLabel(account);
          return (
            <View key={account.id} style={styles.accountRow}>
              <View>
                <Text style={styles.accountTitle}>{label.title}</Text>
                <Text style={styles.accountDetail}>{label.detail}</Text>
              </View>
              {account.type === 'credit_card' ? (
                account.currentBillCents === null ? (
                  <Text style={styles.accountValue}>—</Text>
                ) : (
                  <Money cents={account.currentBillCents} style={styles.accountValue} />
                )
              ) : (
                <Money cents={account.balanceCents} style={styles.accountValue} />
              )}
            </View>
          );
        })}

      {expired && (
        <>
          <Text style={styles.expiredText}>O consentimento do Open Finance vence a cada 12 meses. Reconecte para voltar a ver os dados desse banco.</Text>
          <Pressable
            style={styles.reconnectButton}
            onPress={() => router.push({ pathname: '/perfil/conectar-banco', params: { connectionId: connection.id } })}
            accessibilityRole="button"
          >
            <Text style={styles.reconnectLabel}>Reconectar {connection.institutionName}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

export default function ContasScreen() {
  const { data: connections, isPending, isError, refetch } = useConnectionsQuery();

  if (isPending) {
    return (
      <View style={styles.screen}>
        <Glow />
        <View style={styles.content}>
          <ScreenHeader title="Contas e cartões" onBack={() => router.back()} />
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

  if (connections.length === 0) {
    return (
      <View style={styles.screen}>
        <Glow />
        <View style={styles.content}>
          <ScreenHeader title="Contas e cartões" onBack={() => router.back()} />
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="banco"
              title="Nenhum banco conectado"
              text="Conecte seu banco pelo Open Finance pra ver saldo e fatura aqui. O Planor só lê os dados."
              actionLabel="Conectar meu banco"
              onAction={() => router.push('/perfil/conectar-banco')}
            />
          </View>
        </View>
      </View>
    );
  }

  const active = connections.filter((c) => c.status === 'connected');
  const lastSyncAt = active
    .map((c) => c.lastSyncAt)
    .filter((value): value is string => value !== null)
    .sort()
    .at(-1);
  const syncLabel = lastSyncLabel(lastSyncAt ?? null);
  const activeLabel = active.length === 1 ? '1 conexão ativa' : `${active.length} conexões ativas`;

  return (
    <View style={styles.screen}>
      <Glow />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Contas e cartões" onBack={() => router.back()} action={<AddButton />} />

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, active.length === 0 ? styles.statusDotOff : null]} />
          <Text style={styles.statusText}>{syncLabel ? `${activeLabel} · ${syncLabel}` : activeLabel}</Text>
        </View>

        {connections.map((connection) => (
          <ConnectionCard key={connection.id} connection={connection} />
        ))}

        <Button label="Conectar outro banco" onPress={() => router.push('/perfil/conectar-banco')} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[24] },
  glow: { position: 'absolute', top: -120, left: -60 },
  content: {
    paddingTop: space[60],
    paddingHorizontal: space[24],
    paddingBottom: space[40],
    gap: space[20],
  },
  emptyWrap: { flex: 1, justifyContent: 'center', paddingTop: space[40] },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.surface,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dark.icon.success },
  statusDotOff: { backgroundColor: colors.dark.text.tertiary },
  statusText: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
  card: {
    gap: space[12],
    padding: space[16],
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  cardExpired: { borderColor: 'rgba(240, 68, 82, 0.5)' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  bankAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border.strong,
    backgroundColor: colors.dark.bg.elevated,
  },
  bankAvatarLabel: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.dark.text.secondary,
  },
  cardTexts: { flex: 1, gap: space[2] },
  bankName: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    lineHeight: typography.labelLarge.lineHeight,
    color: colors.dark.text.primary,
  },
  bankStatus: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  bankStatusError: { color: colors.dark.text.error },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[12],
    paddingVertical: space[10],
    borderRadius: radius.lg,
    backgroundColor: colors.dark.bg.surface,
  },
  accountTitle: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  accountDetail: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  accountValue: {
    fontFamily: typography.numberSmall.fontFamily,
    fontSize: typography.numberSmall.fontSize,
    lineHeight: typography.numberSmall.lineHeight,
    color: colors.dark.text.primary,
  },
  expiredText: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
  reconnectButton: {
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.errorSubtle,
  },
  reconnectLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    color: colors.dark.text.error,
  },
});
