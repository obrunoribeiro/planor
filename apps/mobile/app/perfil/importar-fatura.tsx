// Perfil · Importar fatura — CONTEXTO.md §6.2: "Importar fatura (PDF/OFX) funciona com qualquer
// banco." Só OFX por enquanto — PDF precisa de extração de texto + LLM (provedor ainda é decisão
// em aberto, CONTEXTO.md §15.6) e fica pra depois (ver PROGRESSO.md).
import { ApiError } from '@/lib/api/client';
import { Button, colors, EmptyState, Icon, ScreenHeader, Skeleton, space, typography } from '@planor/ui';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccountsQuery, useImportOfxMutation } from '@/lib/api/queries';
import { goBack } from '@/lib/navigation';

type PickedFile = { uri: string; name: string; mimeType: string };

export default function ImportarFaturaScreen() {
  const { data: accounts, isPending, isError, refetch } = useAccountsQuery();
  const { mutate, isPending: isImporting, data: result, error, reset } = useImportOfxMutation();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [fileError, setFileError] = useState<string | undefined>();

  const onPickFile = async () => {
    setFileError(undefined);
    reset();
    const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (picked.canceled) return;

    const asset = picked.assets[0]!;
    if (!asset.name.toLowerCase().endsWith('.ofx')) {
      setFileError('Esse arquivo não é um .ofx — por enquanto só extrato OFX funciona.');
      return;
    }
    setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' });
  };

  const onImport = () => {
    if (!accountId || !file) return;
    mutate({ accountId, fileUri: file.uri, fileName: file.name, mimeType: file.mimeType });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <ScreenHeader title="Importar fatura" onBack={() => goBack('/perfil')} />

        {isPending ? (
          <Skeleton shape="bloco" width="100%" />
        ) : isError ? (
          <EmptyState icon="aviso" title="Não deu pra carregar" text="Confira sua internet e tenta de novo." actionLabel="Tentar de novo" onAction={() => refetch()} />
        ) : !accounts || accounts.length === 0 ? (
          <EmptyState icon="banco" title="Nenhuma conta ainda" text="Conecte um banco ou crie uma conta antes de importar um extrato." />
        ) : (
          <>
            <Text style={styles.label}>Em qual conta?</Text>
            <View style={styles.accountList}>
              {accounts.map((account) => (
                <Pressable
                  key={account.id}
                  style={[styles.accountRow, accountId === account.id ? styles.accountRowActive : null]}
                  onPress={() => setAccountId(account.id)}
                >
                  <Icon name="banco" size={18} color={colors.dark.text.primary} />
                  <Text style={styles.accountName}>{account.name}</Text>
                  {accountId === account.id && <Icon name="check" size={18} color={colors.dark.text.brand} />}
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Arquivo (.ofx)</Text>
            <Pressable style={styles.filePicker} onPress={onPickFile}>
              <Icon name="upload" size={18} color={colors.dark.text.primary} />
              <Text style={styles.fileName} numberOfLines={1}>
                {file ? file.name : 'Escolher arquivo'}
              </Text>
            </Pressable>
            {fileError && <Text style={styles.error}>{fileError}</Text>}

            {error && <Text style={styles.error}>{error instanceof ApiError ? apiErrorLabel(error) : 'Não deu pra importar — tenta de novo.'}</Text>}

            {result && (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>
                  {result.imported} {result.imported === 1 ? 'transação importada' : 'transações importadas'}
                </Text>
                {result.duplicates > 0 && <Text style={styles.resultSubtitle}>{result.duplicates} já existiam e foram ignoradas.</Text>}
              </View>
            )}

            <View style={styles.spacer} />
            <Button label="Importar" onPress={onImport} loading={isImporting} disabled={!accountId || !file} />
          </>
        )}
      </View>
    </View>
  );
}

function apiErrorLabel(error: ApiError): string {
  if (error.status === 422) return 'Não achamos nenhuma transação válida nesse arquivo.';
  if (error.status === 501) return 'Esse tipo de arquivo ainda não é suportado — só OFX por enquanto.';
  return 'Não deu pra importar — tenta de novo.';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  content: { flex: 1, paddingTop: space[60], paddingHorizontal: space[24], gap: space[16] },
  label: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    color: colors.dark.text.secondary,
    marginTop: space[8],
  },
  accountList: { gap: space[8] },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    padding: space[14],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
  },
  accountRowActive: {
    borderColor: colors.dark.border.brand,
    backgroundColor: colors.dark.bg.brandSubtle,
  },
  accountName: { flex: 1, fontFamily: typography.bodyMedium.fontFamily, fontSize: typography.bodyMedium.fontSize, color: colors.dark.text.primary },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    padding: space[14],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  fileName: { flex: 1, fontFamily: typography.bodyMedium.fontFamily, fontSize: typography.bodyMedium.fontSize, color: colors.dark.text.primary },
  error: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.error,
  },
  resultCard: {
    padding: space[16],
    borderRadius: 16,
    backgroundColor: colors.dark.bg.successSubtle,
    gap: space[4],
  },
  resultTitle: { fontFamily: typography.labelMedium.fontFamily, fontSize: typography.labelMedium.fontSize, color: colors.dark.text.success },
  resultSubtitle: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  spacer: { flex: 1 },
});
