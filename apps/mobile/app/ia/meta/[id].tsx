// Meta · detalhe — CONTEXTO.md §6.8. Node 51:1249 no Figma.
//
// Valor e percentual, ritmo sugerido, histórico do que foi registrado e "Registrar valor guardado"
// (o Planor não move dinheiro — a tela explica). Limite de categoria (§6.5) usa a mesma tela: gasto
// do mês contra o limite, com atalho pra categoria. O lápis abre "Editar meta".
import {
  colors,
  Dialog,
  EmptyState,
  gradients,
  Icon,
  radius,
  ScreenHeader,
  Skeleton,
  space,
  typography,
  Button,
  SecondaryButton,
} from '@planor/ui';
import { monthNamePtBR } from '@planor/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money } from '@/components/Money';
import { ScreenGlow } from '@/components/ScreenGlow';
import { goalIcon, GoalProgress } from '@/features/metas/GoalCard';
import { NovaMetaSheet } from '@/features/metas/NovaMetaSheet';
import { RegistrarValorSheet } from '@/features/metas/RegistrarValorSheet';
import { useDeleteGoalMutation, useGoalQuery } from '@/lib/api/queries';
import { goBack } from '@/lib/navigation';
import { useMaskedMoneyText } from '@/lib/useMaskedMoneyText';

/** "2026-09-28T…" → "28 de setembro" (fuso de São Paulo). */
function dayLabel(iso: string): string {
  const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(iso),
  );
  return `${Number(key.slice(8, 10))} de ${monthNamePtBR(key.slice(0, 7))}`;
}

export default function MetaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: goal, isPending, isError, refetch } = useGoalQuery(id);
  const { mutate: remove } = useDeleteGoalMutation();
  const mask = useMaskedMoneyText();
  const [editVisible, setEditVisible] = useState(false);
  const [registerVisible, setRegisterVisible] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="Meta" onBack={() => goBack('/ia/metas')} />
          <Skeleton shape="bloco" width="100%" />
        </View>
      </View>
    );
  }

  if (isError || !goal) {
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

  const isLimit = goal.type === 'category_limit';
  const editButton = (
    <Pressable
      style={styles.headerButton}
      onPress={() => setEditVisible(true)}
      accessibilityLabel={isLimit ? 'Editar limite' : 'Editar meta'}
    >
      <Icon name="editar" size={20} color={colors.dark.text.primary} />
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title={isLimit ? 'Limite' : 'Meta'}
          onBack={() => goBack('/ia/metas')}
          action={editButton}
        />

        <View style={styles.hero}>
          <LinearGradient
            colors={gradients.icone.colors}
            start={gradients.icone.start}
            end={gradients.icone.end}
            style={styles.heroIcon}
          >
            <Icon name={goalIcon(goal)} size={28} color={colors.dark.text.primary} />
          </LinearGradient>
          <Text style={styles.name}>{goal.name}</Text>
          <Money cents={goal.currentCents} style={styles.value} />
          <Text style={styles.of}>
            de <Money cents={goal.targetCents} style={styles.of} />
            {isLimit ? ' por mês' : ''} · {goal.percent}%
          </Text>
        </View>

        <GoalProgress goal={goal} />

        {(goal.suggestedPace || isLimit) && (
          <View style={styles.pace}>
            <Text style={styles.paceLabel}>{isLimit ? 'Este mês' : 'Ritmo sugerido'}</Text>
            <Text style={styles.paceText}>
              {mask(isLimit ? goal.caption : goal.suggestedPace!)}
            </Text>
          </View>
        )}

        {!isLimit && goal.contributions.length > 0 && (
          <View style={styles.history}>
            {goal.contributions.map((c, index) => (
              <View
                key={c.id}
                style={[
                  styles.historyRow,
                  index === goal.contributions.length - 1 ? null : styles.historyBorder,
                ]}
              >
                <View style={styles.historyTexts}>
                  <Text style={styles.historyDate}>{dayLabel(c.createdAt)}</Text>
                  <Text style={styles.historyWhere}>
                    Registrado por você{c.where ? ` · ${c.where}` : ''}
                  </Text>
                </View>
                <Text style={styles.historyAmount}>
                  + <Money cents={c.amountCents} style={styles.historyAmount} />
                </Text>
              </View>
            ))}
          </View>
        )}

        {!isLimit && (
          <View style={styles.note}>
            <Icon name="escudo" size={16} color={colors.dark.text.tertiary} />
            <Text style={styles.noteText}>
              O Planor não movimenta seu dinheiro. Transfira no app do banco e registre aqui.
            </Text>
          </View>
        )}

        <View style={styles.spacer} />

        {isLimit ? (
          goal.categoryId && (
            <SecondaryButton
              label={`Ver gastos de ${goal.categoryName?.toLowerCase() ?? 'categoria'}`}
              icon="gastos"
              onPress={() =>
                router.push({
                  pathname: '/gastos/categoria/[id]',
                  params: { id: goal.categoryId! },
                })
              }
            />
          )
        ) : (
          <Button label="Registrar valor guardado" onPress={() => setRegisterVisible(true)} />
        )}
      </ScrollView>

      <NovaMetaSheet
        visible={editVisible}
        goal={goal}
        onClose={() => setEditVisible(false)}
        onRequestDelete={() => {
          setEditVisible(false);
          setConfirmDelete(true);
        }}
      />
      {!isLimit && (
        <RegistrarValorSheet
          goalId={goal.id}
          visible={registerVisible}
          onClose={() => setRegisterVisible(false)}
          whereOptions={goal.whereOptions}
          suggestedCents={goal.suggestedContributionCents}
        />
      )}
      <Dialog
        visible={confirmDelete}
        tone="erro"
        title={isLimit ? 'Excluir este limite?' : 'Excluir esta meta?'}
        text={
          isLimit
            ? 'Os alertas dessa categoria param.'
            : 'Os valores registrados nela também saem. O dinheiro guardado no banco continua lá.'
        }
        confirmLabel="Excluir"
        onConfirm={() => {
          setConfirmDelete(false);
          remove(goal.id, { onSuccess: () => goBack('/ia/metas') });
        }}
        onCancel={() => setConfirmDelete(false)}
      />
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
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.surface,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
  },
  hero: { alignItems: 'center', gap: space[6] },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: radius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space[8],
  },
  name: {
    fontFamily: typography.h3.fontFamily,
    fontSize: 22,
    lineHeight: 28,
    color: colors.dark.text.primary,
    textAlign: 'center',
  },
  value: {
    fontFamily: typography.numberXl.fontFamily,
    fontSize: typography.numberXl.fontSize,
    lineHeight: typography.numberXl.lineHeight,
    letterSpacing: -0.72,
    color: colors.dark.text.primary,
  },
  of: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.secondary,
  },
  pace: {
    gap: space[4],
    padding: space[16],
    borderRadius: radius['2xl'],
    backgroundColor: colors.dark.bg.brandSubtle,
  },
  paceLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.brand,
  },
  paceText: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    lineHeight: typography.bodyMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  history: {
    paddingHorizontal: space[16],
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingVertical: space[14],
  },
  historyBorder: { borderBottomWidth: 1, borderBottomColor: colors.dark.border.default },
  historyTexts: { flex: 1, gap: space[2] },
  historyDate: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  historyWhere: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  historyAmount: {
    fontFamily: typography.numberSmall.fontFamily,
    fontSize: typography.numberSmall.fontSize,
    lineHeight: typography.numberSmall.lineHeight,
    color: colors.dark.text.secondary,
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
});
