// Perfil · Conectar banco — CONTEXTO.md §6.2. Abre o widget Pluggy Connect (SDK oficial React
// Native, `react-native-pluggy-connect`) com um connectToken novo da nossa API. `includeSandbox`
// só em dev: mostra o conector de testes "Pluggy Bank" (usuário `user-ok`, senha `password-ok`),
// pra validar sem precisar de banco de verdade.
//
// Com `?connectionId=`, abre o widget em modo de atualização daquele banco ("Reconectar" quando o
// consentimento venceu — §6.2, §6.10) em vez de conectar um banco novo.
import { colors, EmptyState, ScreenHeader, Skeleton, space, typography } from '@planor/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PluggyConnect } from 'react-native-pluggy-connect';
import { useCreateConnectTokenMutation, useSyncConnectionItemMutation } from '@/lib/api/queries';

export default function ConectarBancoScreen() {
  const { connectionId } = useLocalSearchParams<{ connectionId?: string }>();
  const { mutate: createToken, data: tokenData, isPending: isCreatingToken, isError: tokenError } = useCreateConnectTokenMutation();
  const { mutate: syncItem, isPending: isSyncing } = useSyncConnectionItemMutation();
  const [connectError, setConnectError] = useState<string | undefined>();
  const [resultMessage, setResultMessage] = useState<string | undefined>();

  useEffect(() => {
    createToken(connectionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só uma vez, ao abrir a tela
  }, []);

  if (isCreatingToken || (!tokenData && !tokenError)) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="Conectar banco" onBack={() => router.back()} />
          <Skeleton shape="bloco" width="100%" />
        </View>
      </View>
    );
  }

  if (tokenError || !tokenData) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <EmptyState icon="aviso" title="Não deu pra abrir" text="Confira sua internet e tenta de novo." actionLabel="Tentar de novo" onAction={() => createToken(connectionId)} />
      </View>
    );
  }

  if (resultMessage) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="Conectar banco" onBack={() => router.back()} />
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>{resultMessage}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {connectError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{connectError}</Text>
        </View>
      )}
      <PluggyConnect
        connectToken={tokenData.accessToken}
        includeSandbox={__DEV__}
        theme="dark"
        onSuccess={({ item }) => {
          syncItem(item.id, {
            onSuccess: (result) => setResultMessage(`${result.accountsSynced} contas conectadas, ${result.transactionsImported} transações importadas.`),
            onError: () => setResultMessage('Banco conectado — as contas aparecem em instantes.'),
          });
        }}
        onError={({ message }) => setConnectError(message || 'Não foi possível conectar o banco.')}
        onClose={() => router.back()}
      />
      {isSyncing && (
        <View style={styles.syncingOverlay}>
          <Text style={styles.syncingLabel}>Importando suas contas…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[24] },
  content: { flex: 1, paddingTop: space[60], paddingHorizontal: space[24], gap: space[20] },
  resultBox: {
    padding: space[20],
    borderRadius: 20,
    backgroundColor: colors.dark.bg.successSubtle,
  },
  resultTitle: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    color: colors.dark.text.success,
  },
  errorBanner: {
    position: 'absolute',
    top: space[60],
    left: space[16],
    right: space[16],
    zIndex: 10,
    padding: space[12],
    borderRadius: 16,
    backgroundColor: colors.dark.bg.errorSubtle,
  },
  errorText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.dark.text.error,
  },
  syncingOverlay: {
    position: 'absolute',
    bottom: space[40],
    left: space[16],
    right: space[16],
    padding: space[14],
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: colors.dark.bg.surface,
  },
  syncingLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    color: colors.dark.text.primary,
  },
});
