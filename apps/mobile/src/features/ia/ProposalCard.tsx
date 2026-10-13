// "Ação proposta" da Planor IA — Figma 33:711 (CONTEXTO.md §6.7, "uma proposta de limite (botões
// 'Criar meta' e 'Ajustar valor')"). A IA só propõe: quem cria é o usuário, tocando aqui. O valor
// por mês da meta é calculado no app (`paceCents`), nunca pelo modelo.
import { formatCents, paceCents } from '@planor/shared';
import { colors, gradients, Icon, radius, space, typography } from '@planor/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CriarLimiteSheet } from '@/features/metas/CriarLimiteSheet';
import { NovaMetaSheet } from '@/features/metas/NovaMetaSheet';
import { useCreateGoalMutation } from '@/lib/api/queries';
import type { AiGoalProposalCard, AiLimitProposalCard } from '@/lib/api/types';
import { useMaskedMoneyText } from '@/lib/useMaskedMoneyText';

function currentMonthKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
    .format(new Date())
    .slice(0, 7);
}

export function ProposalCard({ card }: { card: AiLimitProposalCard | AiGoalProposalCard }) {
  const mask = useMaskedMoneyText();
  const { mutate, isPending } = useCreateGoalMutation();
  const [created, setCreated] = useState(false);
  const [adjustVisible, setAdjustVisible] = useState(false);
  const isLimit = card.type === 'limit_proposal';

  const title = isLimit ? `Limite de ${card.categoryName.toLowerCase()}` : card.name;
  const subtitle = isLimit
    ? `${formatCents(card.targetCents)} por mês · aviso em 80%`
    : card.months
      ? `${formatCents(card.targetCents)} em ${card.months} meses · ${formatCents(paceCents({ targetCents: card.targetCents, savedCents: 0, periods: card.months }))} por mês`
      : `${formatCents(card.targetCents)}, sem prazo`;

  const create = () => {
    if (isLimit) {
      mutate(
        {
          type: 'category_limit',
          categoryId: card.categoryId,
          targetCents: card.targetCents,
          alertAt80: true,
          startNextMonth: false,
        },
        { onSuccess: () => setCreated(true) },
      );
    } else {
      setAdjustVisible(true);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <LinearGradient
          colors={gradients.icone.colors}
          start={gradients.icone.start}
          end={gradients.icone.end}
          style={styles.icon}
        >
          <Icon name="meta" size={18} color={colors.dark.text.primary} />
        </LinearGradient>
        <View style={styles.texts}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{mask(subtitle)}</Text>
        </View>
      </View>
      {created ? (
        <Pressable
          style={styles.done}
          onPress={() => router.push('/ia/metas')}
          accessibilityRole="button"
        >
          <Icon name="check" size={16} color={colors.dark.text.success} />
          <Text style={styles.doneLabel}>
            {isLimit ? 'Limite criado' : 'Meta criada'} · ver em Metas
          </Text>
        </Pressable>
      ) : (
        <View style={styles.buttons}>
          <Pressable onPress={create} disabled={isPending} accessibilityRole="button">
            <LinearGradient
              colors={gradients.botao.colors}
              start={gradients.botao.start}
              end={gradients.botao.end}
              style={styles.button}
            >
              {isPending ? (
                <ActivityIndicator color={colors.dark.text.onBrand} />
              ) : (
                <Text style={styles.buttonLabel}>{isLimit ? 'Criar limite' : 'Criar meta'}</Text>
              )}
            </LinearGradient>
          </Pressable>
          <Pressable
            style={[styles.button, styles.secondary]}
            onPress={() => setAdjustVisible(true)}
            accessibilityRole="button"
          >
            <Text style={styles.buttonLabel}>Ajustar valor</Text>
          </Pressable>
        </View>
      )}

      {isLimit ? (
        <CriarLimiteSheet
          visible={adjustVisible}
          onClose={() => setAdjustVisible(false)}
          onCreated={() => setCreated(true)}
          categoryId={card.categoryId}
          categoryName={card.categoryName}
          monthKey={currentMonthKey()}
          spentThisMonthCents={0}
          monthlyAverageCents={card.monthlyAverageCents}
          averageTicketCents={card.averageTicketCents}
          current={{ targetCents: card.targetCents, alertAtPct: 0.8 }}
          isNew
        />
      ) : (
        <NovaMetaSheet
          visible={adjustVisible}
          onClose={() => setAdjustVisible(false)}
          initial={{ name: card.name, targetCents: card.targetCents, months: card.months }}
          onCreated={() => setCreated(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[12],
    padding: space[16],
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.dark.border.brand,
    backgroundColor: colors.dark.bg.surface,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: space[10] },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1 },
  title: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  subtitle: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  buttons: { flexDirection: 'row', gap: space[8] },
  button: {
    height: 40,
    paddingHorizontal: space[16],
    borderRadius: radius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: { backgroundColor: colors.dark.bg.elevated },
  buttonLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  done: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  doneLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.success,
  },
});
