// Perfil — CONTEXTO.md §6.10. Node 34:649 no Figma.
//
// `user`/`plan` vêm de verdade do `GET /me`. O resto da tela (contas conectadas, segurança,
// casa, amigos, indicação) depende de features que ainda não existem (Pluggy, Fase 5 — ver
// CONTEXTO.md §13), então continua com texto de exemplo do mock até essas partes existirem.
import { Avatar, Badge, colors, Dialog, EmptyState, gradients, GlowOrb, Icon, ListItem, ScreenHeader, Skeleton, space, typography } from '@planor/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useConnectionsQuery, useMeQuery } from '@/lib/api/queries';
import { initialsFromName } from '@/lib/format';
import { EditarPerfilSheet } from '@/features/perfil/EditarPerfilSheet';
import { SegurancaSheet } from '@/features/perfil/SegurancaSheet';
import { perfilMock } from '@/lib/mocks/perfil';
import type { Plan } from '@planor/shared';

const PLAN_LABEL: Record<Plan, string> = {
  free: 'Plano Grátis',
  pro: 'Plano Pro',
  pro_family: 'Plano Família Pro',
};

function GroupLabel({ children }: { children: string }) {
  return <Text style={styles.groupLabel}>{children}</Text>;
}

function Group({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

export default function PerfilScreen() {
  const { account, security, household, friends, referral, version } = perfilMock;
  const { signOut } = useAuth();
  const { data: me, isPending, isError, refetch } = useMeQuery();
  const { data: connections } = useConnectionsQuery();
  const connectedBanksCount = connections?.filter((c) => c.status === 'connected').length ?? 0;
  const [signOutVisible, setSignOutVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [segurancaVisible, setSegurancaVisible] = useState(false);

  if (isPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
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

  return (
    <View style={styles.screen}>
      <View style={styles.glow} pointerEvents="none">
        <GlowOrb
          width={630}
          height={480}
          color="#7C5CFF"
          stops={[
            { offset: 0, opacity: 0.35 },
            { offset: 0.55, opacity: 0.1225 },
            { offset: 1, opacity: 0 },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Perfil" onBack={() => router.back()} />

        <Pressable style={styles.userBlock} onPress={() => setEditVisible(true)}>
          <Avatar initials={initialsFromName(me.name)} size={80} />
          <Text style={styles.userName}>{me.name ?? '—'}</Text>
          <Text style={styles.userEmail}>{me.email}</Text>
        </Pressable>

        <LinearGradient
          colors={gradients.planoCard.colors}
          locations={gradients.planoCard.locations}
          start={gradients.planoCard.start}
          end={gradients.planoCard.end}
          style={styles.planCard}
        >
          <Icon name="estrela" size={22} color={colors.dark.text.primary} />
          <View style={styles.planTexts}>
            <Text style={styles.planLabel}>{PLAN_LABEL[me.plan]}</Text>
            <Text style={styles.planDetail}>{connectedBanksCount} bancos conectados</Text>
          </View>
          {/* TODO: navegar pra /paywall quando essa tela existir (Fase 4, §13). */}
          <Pressable style={styles.planButton}>
            <Text style={styles.planButtonLabel}>Ver o Pro</Text>
          </Pressable>
        </LinearGradient>

        <GroupLabel>CONTA</GroupLabel>
        <Group>
          {/* TODO: navegar pra /perfil/contas (lista com detalhe de cada conexão) quando existir. */}
          <ListItem
            icon="banco"
            title="Contas e cartões"
            value={`${connectedBanksCount} ${connectedBanksCount === 1 ? 'conectada' : 'conectadas'}`}
            onPress={() => router.push('/perfil/contas')}
          />
          <ListItem icon="banco" title="Conectar banco" onPress={() => router.push('/perfil/conectar-banco')} />
          <ListItem icon="upload" title="Importar fatura ou extrato" onPress={() => router.push('/perfil/importar-fatura')} />
          {/* TODO: navegar pra /perfil/meu-plano quando existir. */}
          <ListItem icon="estrela" title="Meu plano" value={account.planLabel} last />
        </Group>

        <GroupLabel>PREFERÊNCIAS</GroupLabel>
        <Group>
          {/* TODO: navegar pra /perfil/notificacoes quando existir. */}
          <ListItem icon="sino" title="Notificações" />
          <ListItem icon="cadeado" title="Segurança" value={security.biometricLabel} onPress={() => setSegurancaVisible(true)} />
          {/* TODO: navegar pra /perfil/privacidade quando existir. */}
          <ListItem icon="escudo" title="Privacidade e dados" />
          {/* TODO: Planor no WhatsApp é v2 (§6.10) — sem destino ainda. */}
          <ListItem icon="chat" title="Planor no WhatsApp" right={<Badge tone="brand" label="Pro" />} last />
        </Group>

        <GroupLabel>JUNTOS</GroupLabel>
        <Group>
          {/* TODO: Família e casal, Amigos e Indique são v2 (§6.11, §6.12, §6.14) — sem destino ainda. */}
          <ListItem icon="inicio" title="Família e casal" value={household.description} right={<Badge tone="alert" label="v2" />} />
          <ListItem icon="pessoas" title="Amigos e feed" value={`${friends.count} amigos`} right={<Badge tone="alert" label="v2" />} />
          <ListItem icon="presente" title="Indique e ganhe" value={referral.reward} right={<Badge tone="alert" label="v2" />} last />
        </Group>

        <GroupLabel>SUPORTE</GroupLabel>
        <Group>
          {/* TODO: navegar pra /perfil/ajuda quando existir. */}
          <ListItem icon="ajuda" title="Ajuda e suporte" />
          <ListItem icon="sair" title="Sair da conta" danger showChevron={false} last onPress={() => setSignOutVisible(true)} />
        </Group>

        <Text style={styles.version}>{version}</Text>
      </ScrollView>

      <Dialog
        visible={signOutVisible}
        tone="erro"
        title="Sair da conta?"
        text="Você vai precisar entrar de novo com o código por e-mail."
        confirmLabel="Sair da conta"
        cancelLabel="Cancelar"
        onConfirm={async () => {
          setSignOutVisible(false);
          await signOut(); // o AuthGate do _layout raiz redireciona pro /welcome sozinho
        }}
        onCancel={() => setSignOutVisible(false)}
      />

      <EditarPerfilSheet visible={editVisible} onClose={() => setEditVisible(false)} me={me} />
      <SegurancaSheet visible={segurancaVisible} onClose={() => setSegurancaVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[24] },
  glow: { position: 'absolute', top: -160, left: -120 },
  content: {
    paddingTop: space[60],
    paddingHorizontal: space[24],
    paddingBottom: space[40],
    gap: space[12],
  },
  userBlock: {
    alignItems: 'center',
    gap: space[6],
    paddingTop: space[4],
    paddingBottom: space[8],
  },
  userName: {
    fontFamily: typography.h2.fontFamily,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.22,
    color: colors.dark.text.primary,
  },
  userEmail: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    color: colors.dark.text.tertiary,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingLeft: space[16],
    paddingRight: space[14],
    paddingVertical: space[14],
    borderRadius: 20,
  },
  planTexts: { flex: 1 },
  planLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  planDetail: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: '#E0E0FF',
  },
  planButton: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[14],
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  planButtonLabel: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: '#25176C',
  },
  groupLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
    marginTop: space[4],
  },
  group: {
    paddingHorizontal: space[16],
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  version: {
    textAlign: 'center',
    marginTop: space[4],
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
});
