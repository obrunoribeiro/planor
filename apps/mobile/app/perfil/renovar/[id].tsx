// Contas · Renovar acesso — CONTEXTO.md §6.2 ("Fluxo de renovação: a tela Renovar acesso refaz o
// consentimento"). Node 83:2329 no Figma. "Continuar no [banco]" abre o widget do Pluggy em modo
// atualização do mesmo item (`/perfil/conectar-banco?connectionId=`).
import { Button, colors, EmptyState, gradients, Icon, Logo, radius, ScreenHeader, Skeleton, space, typography, type IconName } from '@planor/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenGlow } from '@/components/ScreenGlow';
import { BankAvatar } from '@/features/contas/shared';
import { useConnectionsQuery } from '@/lib/api/queries';
import { goBack } from '@/lib/navigation';

const SHARED_DATA: { icon: IconName; title: string; text: string }[] = [
  { icon: 'usuario', title: 'Dados cadastrais', text: 'Nome e CPF, para confirmar que a conta é sua' },
  { icon: 'banco', title: 'Contas e saldos', text: 'Saldo e movimentações da conta' },
  { icon: 'cartao', title: 'Cartão de crédito', text: 'Limite, faturas e parcelamentos' },
  { icon: 'gastos', title: 'Transações', text: 'Histórico dos últimos 12 meses' },
];

export default function RenovarAcessoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: connections, isPending, isError, refetch } = useConnectionsQuery();

  if (isPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="Renovar acesso" onBack={() => goBack('/perfil/contas')} />
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
          onAction={() => (isError ? refetch() : goBack('/perfil/contas'))}
        />
      </View>
    );
  }

  const name = connection.institutionName;

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Renovar acesso" onBack={() => goBack('/perfil/contas')} />
        <View style={styles.link}>
          <LinearGradient colors={gradients.marcaProfundo.colors} start={gradients.marcaProfundo.start} end={gradients.marcaProfundo.end} style={styles.planorTile}>
            <Logo size={34} />
          </LinearGradient>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <BankAvatar name={name} size={64} />
        </View>
        <Text style={styles.title}>Renovar o acesso ao {name} por mais 12 meses:</Text>
        <View style={styles.card}>
          {SHARED_DATA.map((item, i) => (
            <View key={item.title} style={[styles.item, i < SHARED_DATA.length - 1 && styles.itemDivider]}>
              <View style={styles.itemIcon}>
                <Icon name={item.icon} size={18} color={colors.dark.text.brand} />
              </View>
              <View style={styles.itemTexts}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemText}>{item.text}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.terms}>
          <View style={styles.term}>
            <Text style={styles.termLabel}>Validade</Text>
            <Text style={styles.termValue}>12 meses</Text>
          </View>
          <View style={styles.term}>
            <Text style={styles.termLabel}>Finalidade</Text>
            <Text style={styles.termValue}>Organizar suas finanças</Text>
          </View>
        </View>
        <View style={styles.safety}>
          <Icon name="escudo" size={18} color={colors.dark.text.success} />
          <Text style={styles.safetyText}>Nunca pedimos sua senha. Você cancela quando quiser no app do banco ou em Perfil.</Text>
        </View>
        <Button label={`Continuar no ${name}`} onPress={() => router.push(`/perfil/conectar-banco?connectionId=${connection.id}`)} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[24] },
  content: { flexGrow: 1, paddingTop: space[60], paddingHorizontal: space[24], paddingBottom: space[40], gap: space[16] },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[14], paddingTop: space[8], paddingBottom: space[4] },
  planorTile: {
    width: 64,
    height: 64,
    borderRadius: 23.04,
    alignItems: 'center',
    justifyContent: 'center',
    // "Brilho/Borda interna" do Figma (inner shadow branco 30% no topo) — RN não tem inner
    // shadow; uma borda superior de 1px com a mesma cor dá o mesmo filete.
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dark.border.strong },
  dotActive: { backgroundColor: colors.dark.bg.brand },
  title: {
    textAlign: 'center',
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    lineHeight: typography.h2.lineHeight,
    color: colors.dark.text.primary,
  },
  card: {
    backgroundColor: colors.dark.bg.surface,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    borderRadius: radius['3xl'],
    paddingHorizontal: space[16],
    paddingVertical: space[4],
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[14] },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: colors.dark.border.default },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.dark.bg.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTexts: { flex: 1, gap: space[2] },
  itemTitle: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  itemText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  terms: { flexDirection: 'row', gap: space[12] },
  term: {
    flex: 1,
    gap: space[2],
    backgroundColor: colors.dark.bg.sunken,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    borderRadius: 18,
    paddingHorizontal: space[14],
    paddingVertical: space[12],
  },
  termLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  termValue: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.dark.text.primary,
  },
  safety: { flexDirection: 'row', alignItems: 'flex-start', gap: space[10], marginBottom: 'auto' },
  safetyText: {
    flex: 1,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
});
