// Mensagens da Planor IA — CONTEXTO.md §6.7. Figma 33:643 (balões e "Cartão de dados") e 50:1195
// ("Digitando"). O texto da IA obedece ao olho (useMaskedMoneyText); o cartão usa `Money`.
import { colors, gradients, Logo, radius, space, typography } from '@planor/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Money } from '@/components/Money';
import { ProposalCard } from '@/features/ia/ProposalCard';
import type { AiCategoryCard, AiMessage } from '@/lib/api/types';
import { useMaskedMoneyText } from '@/lib/useMaskedMoneyText';

const MAX_BAR_HEIGHT = 56;
/** Tempo de cada fase de um pontinho do "digitando" (subir, descer, esperar 2×). */
const TYPING_STEP_MS = 280;

function Avatar() {
  return (
    <LinearGradient
      colors={gradients.icone.colors}
      start={gradients.icone.start}
      end={gradients.icone.end}
      style={styles.avatar}
    >
      <Logo size={14} />
    </LinearGradient>
  );
}

function CategoryCard({ card }: { card: AiCategoryCard }) {
  const max = Math.max(...card.months.map((m) => m.amountCents), 1);
  const above = card.pctVsAverage !== null && card.pctVsAverage > 0;
  return (
    <LinearGradient
      colors={gradients.cartaoDadosIa.colors}
      start={gradients.cartaoDadosIa.start}
      end={gradients.cartaoDadosIa.end}
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.cardLabel}>{card.title}</Text>
          <Money cents={card.totalCents} style={styles.cardValue} />
        </View>
        {card.pctVsAverage !== null && card.pctVsAverage !== 0 && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: above ? colors.dark.bg.errorSubtle : colors.dark.bg.successSubtle,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeLabel,
                { color: above ? colors.dark.text.error : colors.dark.text.success },
              ]}
            >
              {above ? '+' : ''}
              {card.pctVsAverage}%
            </Text>
          </View>
        )}
      </View>
      <View style={styles.bars}>
        {card.months.map((month) => {
          const height = Math.max(4, Math.round((month.amountCents / max) * MAX_BAR_HEIGHT));
          return (
            <View key={month.label} style={styles.barColumn}>
              {month.active ? (
                <LinearGradient
                  colors={gradients.progresso.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.bar, { height }]}
                />
              ) : (
                <View style={[styles.bar, styles.barInactive, { height }]} />
              )}
              <Text style={styles.barLabel}>{month.label}</Text>
            </View>
          );
        })}
      </View>
    </LinearGradient>
  );
}

export function ChatMessage({ message }: { message: AiMessage }) {
  const mask = useMaskedMoneyText();
  if (message.role === 'user') {
    return (
      <View style={styles.userRow}>
        <LinearGradient
          colors={gradients.botao.colors}
          start={gradients.botao.start}
          end={gradients.botao.end}
          style={styles.userBubble}
        >
          <Text style={styles.text}>{message.content}</Text>
        </LinearGradient>
      </View>
    );
  }
  return (
    <View style={styles.assistantRow}>
      <Avatar />
      <View style={styles.assistantContent}>
        <View style={styles.assistantBubble}>
          <Text style={styles.text}>{mask(message.content)}</Text>
        </View>
        {message.card?.type === 'category' && <CategoryCard card={message.card} />}
        {(message.card?.type === 'limit_proposal' || message.card?.type === 'goal_proposal') && (
          <ProposalCard card={message.card} />
        )}
      </View>
    </View>
  );
}

/** Um pontinho do "digitando": sobe e acende, espera os outros dois e repete. */
function TypingDot({ index }: { index: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      index * TYPING_STEP_MS,
      withRepeat(
        withSequence(
          withTiming(1, { duration: TYPING_STEP_MS, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: TYPING_STEP_MS, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: TYPING_STEP_MS * 2 }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(progress);
  }, [index, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.65,
    transform: [{ translateY: -progress.value * 4 }],
  }));
  return <Animated.View style={[styles.typingDot, style]} />;
}

/** "Digitando" (Figma 50:1195) — a IA está consultando os dados e escrevendo. Os pontos sobem um
 * depois do outro, em onda. */
export function TypingMessage() {
  return (
    <View style={styles.assistantRow} accessibilityLabel="A Planor IA está escrevendo">
      <Avatar />
      <View style={[styles.assistantBubble, styles.typingBubble]}>
        {[0, 1, 2].map((index) => (
          <TypingDot key={index} index={index} />
        ))}
      </View>
    </View>
  );
}

/** Aviso dentro da conversa (erro ou limite de perguntas), no lugar de uma resposta. */
export function ChatNotice({ text }: { text: string }) {
  return (
    <View style={styles.assistantRow}>
      <Avatar />
      <View style={[styles.assistantBubble, styles.noticeBubble]}>
        <Text style={[styles.text, styles.noticeText]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  userBubble: {
    maxWidth: '82%',
    paddingHorizontal: space[16],
    paddingVertical: space[12],
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 6,
  },
  assistantRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[10] },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantContent: { flex: 1, gap: space[10] },
  assistantBubble: {
    paddingHorizontal: space[16],
    paddingVertical: space[12],
    borderTopLeftRadius: 6,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  text: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    lineHeight: typography.bodyMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    paddingVertical: space[16],
  },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dark.text.brand },
  noticeBubble: {
    flex: 1,
    backgroundColor: colors.dark.bg.alertSubtle,
    borderColor: colors.dark.bg.alertSubtle,
  },
  noticeText: { color: colors.dark.text.secondary },
  card: {
    gap: space[12],
    padding: space[16],
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(200, 198, 254, 0.2)',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.secondary,
  },
  cardValue: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    lineHeight: 32,
    letterSpacing: -0.22,
    color: colors.dark.text.primary,
  },
  badge: { paddingHorizontal: space[10], paddingVertical: space[4], borderRadius: 10 },
  badgeLabel: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: space[8] },
  barColumn: { flex: 1, alignItems: 'center', gap: space[4] },
  bar: { width: '100%', borderRadius: radius.xs },
  // Figma 33:683: barra dos meses anteriores (#3A2F7A, mesmo tom das barras do Futuro).
  barInactive: { backgroundColor: '#3A2F7A' },
  barLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.055,
    color: colors.dark.text.tertiary,
  },
});
