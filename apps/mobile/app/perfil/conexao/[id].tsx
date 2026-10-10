// Perfil · Detalhe da conexão — CONTEXTO.md §6.10. Node 53:1306 no Figma (+ 53:1357 "Desconectar
// banco" e 83:2270 "Sincronização falhou").
//
// Status, data de autorização, validade, dados compartilhados e finalidade; "Atualizar agora" e
// "Desconectar" com diálogo de confirmação. Lê da mesma lista de `GET /connections` que a tela
// "Contas e cartões" já carregou — não tem endpoint próprio.
import { Button, colors, Dialog, EmptyState, GlowOrb, Icon, radius, ScreenHeader, Sheet, Skeleton, space, typography } from '@planor/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { bankInitials, lastSyncLabel } from '@/features/contas/connectionLabels';
import { useConnectionsQuery, useDisconnectConnectionMutation, useSyncConnectionMutation } from '@/lib/api/queries';
import type { ConnectionListItem } from '@/lib/api/types';
import { dayAndTimeLabel, longDateLabel } from '@/lib/format';

// O que o Planor pede no consentimento e pra quê (§6.2, §10) — é o mesmo pra todo banco.
const SHARED_DATA = 'Cadastro, conta, cartão e transações';
const PURPOSE = 'Organizar suas finanças';

function statusPill(connection: ConnectionListItem): { label: string; tone: 'success' | 'error' | 'neutral' } {
  const synced = lastSyncLabel(connection.lastSyncAt, { short: true });
  switch (connection.status) {
    case 'connected':
      return { label: synced ? `Conectado · ${synced}` : 'Conectado', tone: 'success' };
    case 'error':
      return { label: synced ? `Erro ao atualizar · ${synced}` : 'Erro ao atualizar', tone: 'error' };
    case 'consent_expired':
      return { label: 'Acesso expirou', tone: 'error' };
    case 'disconnected':
      return { label: 'Desconectado', tone: 'neutral' };
  }
}

const PILL_COLORS = {
  success: { bg: colors.dark.bg.successSubtle, text: colors.dark.text.success, dot: colors.dark.icon.success },
  error: { bg: colors.dark.bg.errorSubtle, text: colors.dark.text.error, dot: colors.dark.icon.error },
  neutral: { bg: colors.dark.bg.elevated, text: colors.dark.text.tertiary, dot: colors.dark.text.tertiary },
} as const;

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last ? null : styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

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

function ConexaoDetail({ connection }: { connection: ConnectionListItem }) {
  const { mutate: sync, isPending: isSyncing } = useSyncConnectionMutation(connection.id);
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnectConnectionMutation(connection.id);
  const [syncFailedVisible, setSyncFailedVisible] = useState(false);
  const [disconnectVisible, setDisconnectVisible] = useState(false);
  const [disconnectError, setDisconnectError] = useState(false);

  const bank = connection.institutionName;
  const pill = statusPill(connection);
  const pillColors = PILL_COLORS[pill.tone];
  const canSync = connection.status === 'connected' || connection.status === 'error';
  const canDisconnect = connection.status !== 'disconnected';

  const runSync = () =>
    sync(undefined, {
      onSuccess: () => setSyncFailedVisible(false),
      onError: () => setSyncFailedVisible(true),
    });

  return (
    <View style={styles.screen}>
      <Glow />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Conexão" onBack={() => router.back()} />

        <View style={styles.bankBlock}>
          <View style={styles.bankAvatar}>
            <Text style={styles.bankAvatarLabel}>{bankInitials(bank)}</Text>
          </View>
          <Text style={styles.bankName}>{bank}</Text>
          <View style={[styles.pill, { backgroundColor: pillColors.bg }]}>
            <View style={[styles.pillDot, { backgroundColor: pillColors.dot }]} />
            <Text style={[styles.pillLabel, { color: pillColors.text }]}>{pill.label}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <InfoRow label="Autorizado em" value={connection.authorizedAt ? longDateLabel(connection.authorizedAt) : '—'} />
          <InfoRow label="Válido até" value={connection.consentExpiresAt ? longDateLabel(connection.consentExpiresAt) : '—'} />
          <InfoRow label="Dados" value={SHARED_DATA} />
          <InfoRow label="Finalidade" value={PURPOSE} last />
        </View>

        <View style={styles.note}>
          <Icon name="escudo" size={16} color={colors.dark.text.tertiary} />
          <Text style={styles.noteText}>O Planor só lê os dados. Não faz pagamentos nem transferências.</Text>
        </View>

        <View style={styles.spacer} />

        {canSync && (
          <Pressable style={styles.secondaryButton} onPress={runSync} disabled={isSyncing} accessibilityRole="button">
            {isSyncing ? (
              <ActivityIndicator color={colors.dark.text.primary} />
            ) : (
              <>
                <Icon name="repetir" size={18} color={colors.dark.text.primary} />
                <Text style={styles.secondaryLabel}>Atualizar agora</Text>
              </>
            )}
          </Pressable>
        )}

        {connection.status === 'consent_expired' && (
          <Button label={`Reconectar ${bank}`} onPress={() => router.push({ pathname: '/perfil/conectar-banco', params: { connectionId: connection.id } })} />
        )}

        {disconnectError && <Text style={styles.errorText}>Não deu pra desconectar agora. Tenta de novo em instantes.</Text>}

        {canDisconnect && (
          <Pressable style={styles.disconnectButton} onPress={() => setDisconnectVisible(true)} disabled={isDisconnecting} accessibilityRole="button">
            <Text style={styles.disconnectLabel}>Desconectar {bank}</Text>
          </Pressable>
        )}
      </ScrollView>

      <Dialog
        visible={disconnectVisible}
        tone="alerta"
        title={`Desconectar ${bank}?`}
        text="Revogamos o consentimento no Open Finance. O que já foi importado continua aqui, mas para de atualizar."
        confirmLabel="Desconectar"
        onConfirm={() => {
          setDisconnectVisible(false);
          setDisconnectError(false);
          disconnect(undefined, {
            onSuccess: () => router.back(),
            onError: () => setDisconnectError(true),
          });
        }}
        onCancel={() => setDisconnectVisible(false)}
      />

      <Sheet
        visible={syncFailedVisible}
        title={`Não conseguimos atualizar o ${bank}`}
        subtitle={
          connection.lastSyncAt
            ? `O banco não respondeu agora. Última atualização: ${dayAndTimeLabel(connection.lastSyncAt)}.`
            : 'O banco não respondeu agora.'
        }
        onClose={() => setSyncFailedVisible(false)}
      >
        <Button label="Tentar agora" onPress={runSync} loading={isSyncing} />
        <Pressable style={styles.notNowButton} onPress={() => setSyncFailedVisible(false)} accessibilityRole="button">
          <Text style={styles.notNowLabel}>Agora não</Text>
        </Pressable>
      </Sheet>
    </View>
  );
}

export default function ConexaoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: connections, isPending, isError, refetch } = useConnectionsQuery();

  if (isPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="Conexão" onBack={() => router.back()} />
          <Skeleton shape="bloco" width="100%" />
          <Skeleton shape="bloco" width="100%" />
        </View>
      </View>
    );
  }

  const connection = connections?.find((c) => c.id === id);

  if (isError || !connection) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <EmptyState
          icon="aviso"
          title={isError ? 'Não deu pra carregar' : 'Conexão não encontrada'}
          text={isError ? 'Confira sua internet e tenta de novo.' : 'Esse banco não aparece mais nas suas contas.'}
          actionLabel={isError ? 'Tentar de novo' : 'Voltar'}
          onAction={() => (isError ? refetch() : router.back())}
        />
      </View>
    );
  }

  return <ConexaoDetail connection={connection} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[24] },
  glow: { position: 'absolute', top: -120, left: -60 },
  content: {
    flexGrow: 1,
    paddingTop: space[60],
    paddingHorizontal: space[24],
    paddingBottom: space[40],
    gap: space[20],
  },
  bankBlock: { alignItems: 'center', gap: space[10] },
  bankAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border.strong,
    backgroundColor: colors.dark.bg.elevated,
  },
  bankAvatarLabel: {
    fontFamily: typography.h3.fontFamily,
    fontSize: typography.h3.fontSize,
    lineHeight: typography.h3.lineHeight,
    color: colors.dark.text.primary,
  },
  bankName: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    lineHeight: typography.h2.lineHeight,
    letterSpacing: -0.22,
    color: colors.dark.text.primary,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    paddingHorizontal: space[12],
    paddingVertical: space[6],
    borderRadius: radius.lg,
  },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillLabel: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
  },
  infoCard: {
    paddingHorizontal: space[16],
    paddingVertical: space[4],
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[12], paddingVertical: space[14] },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.dark.border.default },
  infoLabel: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.dark.text.primary,
  },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: space[10] },
  noteText: {
    flex: 1,
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  spacer: { flex: 1 },
  secondaryButton: {
    flexDirection: 'row',
    gap: space[8],
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border.strong,
    backgroundColor: colors.dark.bg.surface,
  },
  secondaryLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  disconnectButton: { alignItems: 'center', paddingTop: space[4] },
  disconnectLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.error,
  },
  errorText: {
    textAlign: 'center',
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.dark.text.error,
  },
  notNowButton: { alignItems: 'center', paddingTop: space[4] },
  notNowLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.secondary,
  },
});
