// Planor IA — CONTEXTO.md §6.7. Nodes 33:556 (início), 33:643 (conversa) e 50:1195 (digitando)
// no Figma.
//
// Sem conversa aberta: boas-vindas com sugestões. Ao mandar a primeira pergunta vira a conversa;
// `?conversationId=` (do histórico) abre uma antiga e `?nova=1` começa outra. As respostas vêm da
// API (`POST /ai/chat`), com os números calculados no backend — a IA só escreve o texto.
// Ainda sem voz (o microfone não aparece) e sem resposta em streaming — ver PROGRESSO.md.
import {
  colors,
  gradients,
  GlowOrb,
  Icon,
  Logo,
  shadows,
  space,
  typography,
  type IconName,
} from '@planor/ui';
import { monthNamePtBR } from '@planor/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { ChatMessage, ChatNotice, TypingMessage } from '@/features/ia/ChatMessage';
import { ApiError } from '@/lib/api/client';
import {
  useAiChatMutation,
  useAiConversationQuery,
  useConnectionsQuery,
  useMeQuery,
} from '@/lib/api/queries';
import type { AiMessage } from '@/lib/api/types';
import { dayTimeLabel } from '@/lib/format';

function currentMonthKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
    .format(new Date())
    .slice(0, 7);
}

function nextMonthFirstDayLabel(): string {
  const [year, month] = currentMonthKey().split('-').map(Number) as [number, number];
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
  return `1º de ${monthNamePtBR(next)}`;
}

// Só perguntas que as ferramentas de hoje respondem (simular compra parcelada é v2, §6.7).
function suggestions(): { icon: IconName; text: string }[] {
  return [
    { icon: 'comida', text: `Quanto gastei com delivery em ${monthNamePtBR(currentMonthKey())}?` },
    { icon: 'play', text: 'Quais assinaturas eu posso cortar?' },
    { icon: 'meta', text: 'Quanto vai sobrar este mês?' },
    { icon: 'futuro', text: 'Quanto já está comprometido nos próximos meses?' },
  ];
}

type Notice = { kind: 'quota' | 'error'; text: string; retry?: string };

export default function IaScreen() {
  const params = useLocalSearchParams<{ conversationId?: string; nova?: string }>();
  const { data: me } = useMeQuery();
  const { data: connections } = useConnectionsQuery();
  const [conversationId, setConversationId] = useState<string | undefined>(params.conversationId);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const { mutate: send, isPending } = useAiChatMutation();
  const { data: loaded } = useAiConversationQuery(params.conversationId);
  const scrollRef = useRef<ScrollView>(null);

  // Do histórico: abre a conversa escolhida. "Nova conversa": limpa.
  useEffect(() => {
    if (params.nova) {
      setConversationId(undefined);
      setMessages([]);
      setNotice(null);
    } else if (params.conversationId) {
      setConversationId(params.conversationId);
      setNotice(null);
    }
  }, [params.conversationId, params.nova]);

  useEffect(() => {
    if (loaded && loaded.id === conversationId) setMessages(loaded.messages);
  }, [loaded, conversationId]);

  const ask = (text: string) => {
    const message = text.trim();
    if (!message || isPending) return;
    setDraft('');
    setNotice(null);
    setMessages((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        role: 'user',
        content: message,
        card: null,
        createdAt: new Date().toISOString(),
      },
    ]);
    send(
      { conversationId, message },
      {
        onSuccess: (data) => {
          setConversationId(data.conversationId);
          setMessages((current) => [...current, data.message]);
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 402) {
            setNotice({
              kind: 'quota',
              text: `Suas perguntas de ${monthNamePtBR(currentMonthKey())} acabaram. Elas voltam em ${nextMonthFirstDayLabel()}.`,
            });
          } else {
            setNotice({
              kind: 'error',
              text: 'Não consegui responder agora. Confira sua internet e tenta de novo.',
              retry: message,
            });
          }
        },
      },
    );
  };

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(timer);
  }, [messages.length, isPending, notice]);

  const activeBanks = (connections ?? []).filter((c) => c.status !== 'disconnected').length;
  const banksLabel =
    activeBanks === 0
      ? 'Nenhum banco conectado'
      : activeBanks === 1
        ? 'Lendo seus dados de 1 banco'
        : `Lendo seus dados de ${activeBanks} bancos`;
  // O campo de mensagem fica fixo acima da tab bar; com o teclado aberto, sobe junto com ele
  // (KeyboardAvoidingView não move elemento com posição absoluta).
  const keyboard = useAnimatedKeyboard();
  const inputBarStyle = useAnimatedStyle(() => ({
    bottom: Math.max(INPUT_BAR_BOTTOM, keyboard.height.value + KEYBOARD_GAP),
  }));
  const keyboardSpacerStyle = useAnimatedStyle(() => ({ height: keyboard.height.value }));
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', () =>
      scrollRef.current?.scrollToEnd({ animated: true }),
    );
    return () => subscription.remove();
  }, []);

  const firstName = me?.name?.split(' ')[0];
  const inConversation = messages.length > 0 || isPending;

  return (
    <View style={styles.screen}>
      <View style={styles.glow} pointerEvents="none">
        <GlowOrb
          width={630}
          height={520}
          color="#7C5CFF"
          stops={[
            { offset: 0, opacity: 0.35 },
            { offset: 0.55, opacity: 0.1225 },
            { offset: 1, opacity: 0 },
          ]}
        />
      </View>

      <View style={styles.topBar}>
        <LinearGradient
          colors={gradients.icone.colors}
          start={gradients.icone.start}
          end={gradients.icone.end}
          style={styles.topBarLogo}
        >
          <Logo size={20} />
        </LinearGradient>
        <View style={styles.topBarText}>
          <Text style={styles.topBarTitle}>Planor IA</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusLabel}>{inConversation ? 'Online' : banksLabel}</Text>
          </View>
        </View>
        <Pressable
          style={styles.iconButton}
          onPress={() => router.push('/ia/historico')}
          accessibilityLabel="Histórico de conversas"
        >
          <Icon name="chat" size={20} color={colors.dark.text.primary} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!inConversation ? (
          <View style={styles.welcome}>
            <LinearGradient
              colors={gradients.marcaProfundo.colors}
              start={gradients.marcaProfundo.start}
              end={gradients.marcaProfundo.end}
              style={[styles.orbit, shadows.marcaForte]}
            >
              <Logo size={48} />
            </LinearGradient>
            <Text style={styles.greeting}>
              {firstName ? `Oi, ${firstName}. ` : 'Oi! '}O que você quer saber sobre seu dinheiro?
            </Text>
            <Text style={styles.subtitle}>
              Eu leio suas contas e cartões e respondo com seus números, não com dicas genéricas.
            </Text>
            <View style={styles.suggestions}>
              {suggestions().map((s) => (
                <Pressable
                  key={s.text}
                  style={styles.suggestion}
                  onPress={() => ask(s.text)}
                  accessibilityRole="button"
                >
                  <Icon name={s.icon} size={20} color={colors.dark.text.brand} />
                  <Text style={styles.suggestionText}>{s.text}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.conversation}>
            {messages[0] && (
              <Text style={styles.timestamp}>
                {capitalizeFirst(dayTimeLabel(messages[0].createdAt))}
              </Text>
            )}
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isPending && <TypingMessage />}
          </View>
        )}
        {notice && (
          <View style={styles.noticeWrap}>
            <ChatNotice text={notice.text} />
            {notice.retry && (
              <Pressable
                style={styles.retry}
                onPress={() => ask(notice.retry!)}
                accessibilityRole="button"
              >
                <Text style={styles.retryLabel}>Tentar de novo</Text>
              </Pressable>
            )}
          </View>
        )}
        {/* Com o teclado aberto, o fim da conversa fica acima dele. */}
        <Animated.View style={keyboardSpacerStyle} />
      </ScrollView>

      <Animated.View style={[styles.inputBar, inputBarStyle]}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Pergunte sobre seu dinheiro"
          placeholderTextColor={colors.dark.text.tertiary}
          returnKeyType="send"
          onSubmitEditing={() => ask(draft)}
          editable={notice?.kind !== 'quota'}
          maxLength={1000}
        />
        <Pressable
          onPress={() => ask(draft)}
          disabled={!draft.trim() || isPending}
          accessibilityLabel="Enviar pergunta"
        >
          <LinearGradient
            colors={gradients.icone.colors}
            start={gradients.icone.start}
            end={gradients.icone.end}
            style={[styles.sendButton, !draft.trim() || isPending ? styles.sendDisabled : null]}
          >
            <Icon name="enviar" size={18} color={colors.dark.text.primary} />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/** Distância do campo de mensagem até a borda de baixo, acima da tab bar (Figma 33:726). */
const INPUT_BAR_BOTTOM = 116;
/** Espaço entre o campo e o teclado aberto. */
const KEYBOARD_GAP = 12;

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  glow: { position: 'absolute', top: 80, left: -120 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    height: 48,
    paddingHorizontal: space[24],
    marginTop: 56,
  },
  topBarLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarText: { flex: 1 },
  topBarTitle: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    lineHeight: typography.labelLarge.lineHeight,
    color: colors.dark.text.primary,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dark.text.success },
  statusLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.surface,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
  },
  // Espaço embaixo pro campo de mensagem e a tab bar, que ficam por cima.
  body: { paddingHorizontal: space[24], paddingTop: space[20], paddingBottom: 200 },
  welcome: { alignItems: 'center', gap: space[14] },
  orbit: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontFamily: typography.h1.fontFamily,
    fontSize: 26,
    lineHeight: 36,
    letterSpacing: -0.39,
    textAlign: 'center',
    color: colors.dark.text.primary,
  },
  subtitle: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    lineHeight: typography.bodyMedium.lineHeight,
    textAlign: 'center',
    color: colors.dark.text.secondary,
  },
  suggestions: { width: '100%', gap: space[10], paddingTop: space[12] },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingHorizontal: space[16],
    paddingVertical: space[14],
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  suggestionText: {
    flex: 1,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  conversation: { gap: space[16] },
  timestamp: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    letterSpacing: typography.caption.letterSpacing,
    textAlign: 'center',
    color: colors.dark.text.tertiary,
  },
  noticeWrap: { gap: space[10], marginTop: space[16] },
  retry: {
    alignSelf: 'flex-start',
    marginLeft: 38,
    paddingHorizontal: space[16],
    paddingVertical: space[10],
    borderRadius: 20,
    backgroundColor: colors.dark.bg.elevated,
  },
  retryLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  inputBar: {
    position: 'absolute',
    bottom: INPUT_BAR_BOTTOM,
    left: 16,
    right: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[10],
    paddingLeft: 18,
    paddingRight: space[6],
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.dark.border.strong,
    backgroundColor: colors.dark.bg.surface,
  },
  input: {
    flex: 1,
    fontFamily: typography.bodyLarge.fontFamily,
    fontSize: 15,
    color: colors.dark.text.primary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.5 },
});
