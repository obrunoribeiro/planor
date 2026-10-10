// Home · Como calculamos a sobra — CONTEXTO.md §6.4. Node 83:2405 no Figma.
//
// Abre ao tocar no valor da sobra na Home. Mesma conta da Home (`GET /forecast/leftover`):
// renda − já gasto − a vencer, e o que ainda vence no mês por tipo. "Ajustar minha renda" abre a
// mesma sheet de Editar perfil.
import { colors, EmptyState, Icon, radius, ScreenHeader, SecondaryButton, Skeleton, space, typography, type IconName } from '@planor/ui';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money } from '@/components/Money';
import { ScreenGlow } from '@/components/ScreenGlow';
import { EditarPerfilSheet } from '@/features/perfil/EditarPerfilSheet';
import { useLeftoverForecastQuery, useMeQuery } from '@/lib/api/queries';
import { monthNamePtBR, untilEndOfMonthLabel } from '@/lib/format';
import { goBack } from '@/lib/navigation';

function Row({
  icon,
  iconSize = 18,
  title,
  caption,
  value,
  last = false,
}: {
  icon: IconName;
  /** O `Icon` estica o desenho até `size`; a seta de entrada no Figma tem 9,3 px num quadro de 18. */
  iconSize?: number;
  title: string;
  caption: string;
  value: ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last ? null : styles.rowBorder]}>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={iconSize} color={colors.dark.text.brand} />
      </View>
      <View style={styles.rowTexts}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowCaption}>{caption}</Text>
      </View>
      {value}
    </View>
  );
}

function SignedMoney({ sign, cents }: { sign: '+' | '−'; cents: number }) {
  return (
    <Text style={styles.rowValue}>
      {sign} <Money cents={cents} style={styles.rowValue} />
    </Text>
  );
}

function DueLine({ label, cents }: { label: string; cents: number }) {
  return (
    <View style={styles.dueLine}>
      <Text style={styles.dueLabel}>{label}</Text>
      <Money cents={cents} style={styles.dueValue} />
    </View>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <View style={styles.note}>
      <Icon name="check" size={14} color={colors.dark.text.tertiary} />
      <Text style={styles.noteText}>{children}</Text>
    </View>
  );
}

export default function SobraScreen() {
  const { data, isPending, isError, refetch } = useLeftoverForecastQuery();
  const { data: me } = useMeQuery();
  const [editVisible, setEditVisible] = useState(false);

  if (isPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="Sobra prevista" onBack={() => goBack('/')} />
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

  const monthEndLabel = untilEndOfMonthLabel(data.month);
  const dueUntilLabel = `${data.monthEndDateKey.slice(8, 10)}/${data.monthEndDateKey.slice(5, 7)}`;
  const hasIncome = data.monthlyIncomeCents > 0;

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Sobra prevista" onBack={() => goBack('/')} />

        <View style={styles.hero}>
          <Text style={styles.heroLegend}>Até {monthEndLabel} devem sobrar</Text>
          <Money cents={data.projectedLeftoverCents} style={styles.heroValue} />
        </View>

        <View style={styles.card}>
          <Row
            icon="entrada"
            iconSize={9.3}
            title="Renda do mês"
            caption={hasIncome ? 'Informada por você' : 'Ainda não informada'}
            value={<SignedMoney sign="+" cents={data.monthlyIncomeCents} />}
          />
          <Row icon="gastos" title="Já gasto" caption="Do dia 1º até hoje" value={<SignedMoney sign="−" cents={data.spentThisMonthCents} />} />
          <Row
            icon="futuro"
            title={`A vencer até ${dueUntilLabel}`}
            caption="Parcelas, assinaturas e contas fixas"
            value={<SignedMoney sign="−" cents={data.due.totalCents} />}
            last
          />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>= Sobra prevista</Text>
            <Money cents={data.projectedLeftoverCents} style={styles.totalValue} />
          </View>
        </View>

        <View style={styles.dueCard}>
          <Text style={styles.dueTitle}>O que ainda vence em {monthNamePtBR(data.month)}</Text>
          <DueLine label="Parcelas" cents={data.due.installmentsCents} />
          <DueLine label="Contas fixas" cents={data.due.billsCents} />
          <DueLine label="Assinaturas" cents={data.due.subscriptionsCents} />
          {data.due.otherCents > 0 && <DueLine label="Outros já agendados" cents={data.due.otherCents} />}
        </View>

        <View style={styles.notes}>
          <Note>Compras no cartão contam no dia da compra, não no dia da fatura.</Note>
          <Note>Gastos que você ocultou das análises ficam de fora.</Note>
          {data.undetailedCents > 0 && (
            <Note>
              &quot;Já gasto&quot; inclui <Money cents={data.undetailedCents} style={styles.noteText} /> em compras no cartão que o banco
              ainda não detalhou.
            </Note>
          )}
        </View>

        <View style={styles.spacer} />

        {me && <SecondaryButton label={hasIncome ? 'Ajustar minha renda' : 'Informar minha renda'} icon="editar" onPress={() => setEditVisible(true)} />}
      </ScrollView>

      {me && <EditarPerfilSheet visible={editVisible} onClose={() => setEditVisible(false)} me={me} />}
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
    gap: space[20],
  },
  hero: { alignItems: 'center', gap: space[4] },
  heroLegend: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
  heroValue: {
    fontFamily: typography.numberXl.fontFamily,
    fontSize: typography.numberXl.fontSize,
    lineHeight: typography.numberXl.lineHeight,
    letterSpacing: -0.72,
    color: colors.dark.text.primary,
  },
  card: {
    paddingHorizontal: space[16],
    paddingVertical: space[4],
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[14] },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.dark.border.default },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.brandSubtle,
  },
  rowTexts: { flex: 1, gap: space[2] },
  rowTitle: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  rowCaption: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  rowValue: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[16] },
  totalLabel: {
    flex: 1,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    lineHeight: typography.labelLarge.lineHeight,
    color: colors.dark.text.primary,
  },
  totalValue: {
    fontFamily: typography.numberMedium.fontFamily,
    fontSize: typography.numberMedium.fontSize,
    lineHeight: typography.numberMedium.lineHeight,
    color: colors.dark.text.brand,
  },
  dueCard: {
    gap: space[10],
    padding: space[16],
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  dueTitle: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.dark.text.secondary,
  },
  dueLine: { flexDirection: 'row', alignItems: 'flex-start' },
  dueLabel: {
    flex: 1,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
  dueValue: {
    fontFamily: typography.numberSmall.fontFamily,
    fontSize: typography.numberSmall.fontSize,
    lineHeight: typography.numberSmall.lineHeight,
    color: colors.dark.text.primary,
  },
  notes: { gap: space[8] },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: space[8] },
  noteText: {
    flex: 1,
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  spacer: { flex: 1 },
});
