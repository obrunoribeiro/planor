// Metas — CONTEXTO.md §6.8. Node 51:1177 no Figma (vazio: 82:2118).
//
// "Só suas": metas de guardar dinheiro e limites de categoria. A seção "Em grupo" (convites e
// metas com amigos, §6.12) entra na Fase 5. "Montar uma meta com a Planor IA" abre o chat com a
// pergunta pronta.
import {
  colors,
  EmptyState,
  ScreenHeader,
  SecondaryButton,
  Skeleton,
  space,
  typography,
  Button,
} from '@planor/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenGlow } from '@/components/ScreenGlow';
import { GoalCard } from '@/features/metas/GoalCard';
import { NovaMetaSheet } from '@/features/metas/NovaMetaSheet';
import { useGoalsQuery } from '@/lib/api/queries';
import { goBack } from '@/lib/navigation';

export default function MetasScreen() {
  const { data, isPending, isError, refetch } = useGoalsQuery();
  const [newVisible, setNewVisible] = useState(false);

  if (isPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="Metas" onBack={() => goBack('/ia')} />
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

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Metas" onBack={() => goBack('/ia')} />

        {data.items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="meta"
              title="Nenhuma meta ainda"
              text="Junte para uma viagem, monte sua reserva ou ponha um limite numa categoria. O Planor acompanha; o dinheiro continua no seu banco."
            />
          </View>
        ) : (
          <>
            <Text style={styles.section}>SÓ SUAS</Text>
            {data.items.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </>
        )}

        <View style={styles.spacer} />
        <View style={styles.actions}>
          <Button label="Nova meta" onPress={() => setNewVisible(true)} />
          <SecondaryButton
            label="Montar uma meta com a Planor IA"
            icon="ia"
            onPress={() =>
              router.navigate({
                pathname: '/ia',
                params: { nova: String(Date.now()), pergunta: 'Me ajuda a montar uma meta?' },
              })
            }
          />
        </View>
      </ScrollView>

      <NovaMetaSheet visible={newVisible} onClose={() => setNewVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[24] },
  content: {
    flexGrow: 1,
    paddingTop: space[60],
    paddingHorizontal: space[24],
    paddingBottom: space[40],
    gap: space[16],
  },
  emptyWrap: { paddingTop: space[40] },
  section: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  spacer: { flex: 1 },
  actions: { gap: space[12] },
});
