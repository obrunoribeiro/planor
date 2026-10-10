// Perfil · Conexão — CONTEXTO.md §6.10 ("status, data de autorização, validade, dados
// compartilhados e finalidade; Atualizar agora e Desconectar, com diálogo de confirmação") e
// §6.2. Nodes 53:1306 (tela) e 53:1357 (diálogo) no Figma.
//
// "Autorizado em" fica de fora: o banco não guarda a data em que o consentimento foi dado (só
// quando vence) e o Pluggy não devolve isso — ver PROGRESSO.md. Os dados lidos de verdade estão
// na tela; nada inventado.
import { colors, Dialog, EmptyState, Icon, ScreenHeader, SecondaryButton, Skeleton, space, typography } from '@planor/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenGlow } from '@/components/ScreenGlow';
import { BankAvatar, connectionUiState, InfoRows } from '@/features/contas/shared';
import { useConnectionsQuery, useDisconnectConnectionMutation, useRefreshConnectionMutation } from '@/lib/api/queries';
import { longDateFromIso, relativeTimeLabel } from '@/lib/format';

export default function ConexaoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: connections, isPending, isError, refetch } = useConnectionsQuery();
  const { mutate: refresh, isPending: isRefreshing, data: refreshResult, isError: refreshFailed } = useRefreshConnectionMutation();
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnectConnectionMutation();
  const [confirmVisible, setConfirmVisible] = useState(false);

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
          text={isError ? 'Confira sua internet e tenta de novo.' : 'Ela pode ter sido desconectada.'}
          actionLabel={isError ? 'Tentar de novo' : 'Voltar'}
          onAction={() => (isError ? refetch() : router.back())}
        />
      </View>
    );
  }

  const state = connectionUiState(connection);
  const statusTone = state === 'ok' ? 'success' : state === 'expiring' ? 'alert' : 'error';
  const statusLabel =
    state === 'expired'
      ? 'Acesso expirado'
      : state === 'error'
        ? 'Não conseguimos atualizar'
        : `Conectado${connection.lastSyncAt ? ` · atualizado ${relativeTimeLabel(connection.lastSyncAt)}` : ''}`;

  const rows = [
    ...(connection.authorizedAt ? [{ label: 'Autorizado em', value: longDateFromIso(connection.authorizedAt) }] : []),
    ...(connection.consentExpiresAt ? [{ label: 'Válido até', value: longDateFromIso(connection.consentExpiresAt) }] : []),
    { label: 'Dados', value: 'Cadastro, conta, cartão e transações' },
    { label: 'Finalidade', value: 'Organizar suas finanças' },
  ];

  // Meu Pluggy não aceita pedido de atualização (PROGRESSO.md) — aí "Atualizar agora" só relê o
  // que o agregador já trouxe, e a mensagem diz isso em vez de prometer dado novo.
  const refreshMessage = refreshFailed
    ? 'Não deu pra atualizar agora. Tenta de novo em instantes.'
    : refreshResult
      ? refreshResult.refreshRequested
        ? 'Pedimos dados novos ao banco. Eles aparecem em alguns minutos.'
        : `Dados lidos de novo${refreshResult.transactionsImported > 0 ? ` · ${refreshResult.transactionsImported} transações novas` : ' · nada novo por enquanto'}.`
      : null;

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <View style={styles.content}>
        <ScreenHeader title="Conexão" onBack={() => router.back()} />
        <View style={styles.bank}>
          <BankAvatar name={connection.institutionName} size={72} />
          <Text style={styles.bankName}>{connection.institutionName}</Text>
          <View style={[styles.status, styles[`status_${statusTone}`]]}>
            <View style={[styles.statusDot, { backgroundColor: colors.dark.text[statusTone] }]} />
            <Text style={[styles.statusLabel, { color: colors.dark.text[statusTone] }]}>{statusLabel}</Text>
          </View>
        </View>
        <InfoRows rows={rows} />
        <View style={styles.note}>
          <Icon name="escudo" size={16} color={colors.dark.text.tertiary} />
          <Text style={styles.noteText}>O Planor só lê os dados. Não faz pagamentos nem transferências.</Text>
        </View>
        <View style={styles.spacer} />
        {refreshMessage && <Text style={styles.refreshMessage}>{refreshMessage}</Text>}
        {state === 'expired' ? (
          <SecondaryButton label="Renovar acesso" icon="repetir" onPress={() => router.push(`/perfil/renovar/${connection.id}`)} />
        ) : (
          <SecondaryButton label="Atualizar agora" icon="repetir" loading={isRefreshing} onPress={() => refresh(connection.id)} />
        )}
        <Pressable style={styles.disconnect} onPress={() => setConfirmVisible(true)} accessibilityRole="button" disabled={isDisconnecting}>
          <Text style={styles.disconnectLabel}>Desconectar {connection.institutionName}</Text>
        </Pressable>
      </View>
      <Dialog
        visible={confirmVisible}
        tone="alerta"
        title={`Desconectar ${connection.institutionName}?`}
        text="Revogamos o consentimento no Open Finance. O que já foi importado continua aqui, mas para de atualizar."
        confirmLabel="Desconectar"
        onConfirm={() => {
          setConfirmVisible(false);
          disconnect(connection.id, { onSuccess: () => router.back() });
        }}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[24] },
  content: { flex: 1, paddingTop: space[60], paddingHorizontal: space[24], paddingBottom: space[40], gap: space[20] },
  bank: { alignItems: 'center', gap: space[10] },
  bankName: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    lineHeight: typography.h2.lineHeight,
    color: colors.dark.text.primary,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    paddingHorizontal: space[12],
    paddingVertical: space[6],
    borderRadius: 14,
  },
  status_success: { backgroundColor: colors.dark.bg.successSubtle },
  status_alert: { backgroundColor: colors.dark.bg.alertSubtle },
  status_error: { backgroundColor: colors.dark.bg.errorSubtle },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
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
  refreshMessage: {
    textAlign: 'center',
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    color: colors.dark.text.secondary,
  },
  disconnect: { alignItems: 'center', paddingTop: space[4], minHeight: 44, justifyContent: 'center' },
  disconnectLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.error,
  },
});
