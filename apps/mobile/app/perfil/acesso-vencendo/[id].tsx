// Contas · Acesso vencendo — CONTEXTO.md §6.2 ("avisar com 7 dias e 1 dia de antecedência: push,
// alerta e a tela Acesso vencendo") e §6.9 (destino do alerta `consent_expiring`). Node 83:2288
// no Figma.
//
// Fora do Figma de propósito: "Autorizado em" (a data não existe no banco — ver Conexão) e
// "Lembrar amanhã" (não há onde guardar um adiamento; o aviso de 1 dia já sai sozinho pelo job
// `consent-expiry-check`). Ver PROGRESSO.md.
import { Badge, Button, colors, EmptyState, ScreenHeader, Skeleton, space, typography } from '@planor/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { BankAvatar, expiresInLabel, InfoRows, ScreenGlow } from '@/features/contas/shared';
import { useConnectionsQuery } from '@/lib/api/queries';
import { longDateFromIso } from '@/lib/format';

export default function AcessoVencendoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: connections, isPending, isError, refetch } = useConnectionsQuery();

  if (isPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="" onBack={() => router.back()} />
          <Skeleton shape="bloco" width="100%" />
        </View>
      </View>
    );
  }

  const connection = connections?.find((c) => c.id === id);

  if (isError || !connection || connection.consentExpiresAt === null || connection.consentDaysLeft === null) {
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

  const name = connection.institutionName;

  return (
    <View style={styles.screen}>
      <ScreenGlow tone="alerta" />
      <View style={styles.content}>
        <ScreenHeader title={name} onBack={() => router.back()} />
        <View style={styles.hero}>
          <BankAvatar name={name} size={72} />
          <Badge tone="alert" label={expiresInLabel(connection.consentDaysLeft)} />
          <Text style={styles.title}>Renove o acesso ao {name}</Text>
          <Text style={styles.text}>
            Pelas regras do Open Finance, cada autorização vale por até 12 meses. Renovar leva 1 minuto.
          </Text>
        </View>
        <InfoRows
          rows={[
            { label: 'Vence em', value: longDateFromIso(connection.consentExpiresAt) },
            { label: 'Se vencer', value: 'O histórico fica, mas para de atualizar' },
          ]}
        />
        <View style={styles.spacer} />
        <Button label="Renovar acesso" onPress={() => router.push(`/perfil/renovar/${connection.id}`)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[24] },
  content: { flex: 1, paddingTop: space[60], paddingHorizontal: space[24], paddingBottom: space[40], gap: space[20] },
  hero: { alignItems: 'center', gap: space[14], paddingTop: space[8] },
  title: {
    textAlign: 'center',
    fontFamily: typography.h1.fontFamily,
    fontSize: typography.h1.fontSize,
    lineHeight: typography.h1.lineHeight,
    color: colors.dark.text.primary,
  },
  text: {
    textAlign: 'center',
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    lineHeight: typography.bodyMedium.lineHeight,
    color: colors.dark.text.secondary,
  },
  spacer: { flex: 1 },
});
