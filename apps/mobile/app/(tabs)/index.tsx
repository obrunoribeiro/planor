// Home · Início — CONTEXTO.md §6.4. Node 25:149 no Figma.
import { colors, EmptyState, RevealScrollView, Skeleton, space } from '@planor/ui';
import { StyleSheet, View } from 'react-native';
import {
  BannerPro,
  HeaderSobra,
  JaComprometidoCard,
  ParaOndeVaiSeuDinheiro,
  PlanoDaSemanaCard,
  RetrospectivaCard,
} from '@/features/home';
import { useHomeQuery } from '@/lib/api/queries';

function HomeSkeleton() {
  return (
    <View style={styles.skeletonScreen}>
      <Skeleton shape="bloco" width="100%" />
      <View style={styles.skeletonSections}>
        <Skeleton shape="bloco" width="100%" />
        <Skeleton shape="bloco" width="100%" />
        <Skeleton shape="bloco" width="100%" />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { data, isPending, isError, refetch } = useHomeQuery();

  if (isPending) return <HomeSkeleton />;

  if (isError) {
    return (
      <View style={styles.centered}>
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
    <RevealScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <HeaderSobra userName={data.user.name} unreadAlerts={data.unreadAlerts} leftover={data.leftover} month={data.month} />
      <View style={styles.sections}>
        {data.retrospective && <RetrospectivaCard monthLabel={data.retrospective} />}
        {data.committed && <JaComprometidoCard committed={data.committed} />}
        <PlanoDaSemanaCard items={data.weeklyPlan.items} />
        <ParaOndeVaiSeuDinheiro
          month={data.month}
          spendingThisMonth={data.spendingThisMonth}
          subscriptions={data.subscriptions}
          installments={data.installments}
          fixedVsVariable={data.fixedVsVariable}
        />
        {data.user.plan === 'free' && <BannerPro />}
      </View>
    </RevealScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.dark.bg.default,
  },
  content: {
    paddingBottom: 132, // espaço pra tab bar flutuante não cobrir o fim do conteúdo
    gap: space[24],
  },
  sections: {
    gap: space[24],
    paddingHorizontal: space[20],
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[24],
    backgroundColor: colors.dark.bg.default,
  },
  skeletonScreen: {
    flex: 1,
    paddingTop: space[60],
    paddingHorizontal: space[20],
    gap: space[24],
    backgroundColor: colors.dark.bg.default,
  },
  skeletonSections: {
    gap: space[14],
  },
});
