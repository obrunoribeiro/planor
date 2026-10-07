// Planor IA · Início — CONTEXTO.md §6.7. Node 33:556 no Figma. Fase 1: sem o modelo ligado
// ainda (§13) — os botões de sugestão e o campo de mensagem não mandam nada de verdade.
import { colors, gradients, GlowOrb, Icon, Logo, shadows, space, typography, type IconName } from '@planor/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { iaMock } from '@/lib/mocks/ia';

function SuggestionRow({ icon, text }: { icon: IconName; text: string }) {
  // TODO: mandar a pergunta pro chat quando o modelo estiver ligado (Fase 3, §13).
  return (
    <Pressable style={styles.suggestion}>
      <Icon name={icon} size={20} color="#C8C6FE" />
      <Text style={styles.suggestionText}>{text}</Text>
    </Pressable>
  );
}

export default function IaScreen() {
  const { connectedBanksLabel, greeting, subtitle, suggestions } = iaMock;

  return (
    <KeyboardDismissView>
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
          <LinearGradient colors={gradients.icone.colors} start={gradients.icone.start} end={gradients.icone.end} style={styles.topBarLogo}>
            <Logo size={20} />
          </LinearGradient>
          <View style={styles.topBarText}>
            <Text style={styles.topBarTitle}>Planor IA</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusLabel}>{connectedBanksLabel}</Text>
            </View>
          </View>
          {/* TODO: navegar pra /ia/historico quando essa tela existir. */}
          <Pressable style={styles.iconButton} accessibilityLabel="Histórico de conversas">
            <Icon name="chat" size={20} color={colors.dark.text.primary} />
          </Pressable>
        </View>

        <View style={styles.welcome}>
          <LinearGradient
            colors={gradients.marcaProfundo.colors}
            start={gradients.marcaProfundo.start}
            end={gradients.marcaProfundo.end}
            style={[styles.orbit, shadows.marcaForte]}
          >
            <Logo size={48} />
          </LinearGradient>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.suggestions}>
            {suggestions.map((suggestion) => (
              <SuggestionRow key={suggestion.id} icon={suggestion.icon} text={suggestion.text} />
            ))}
          </View>
        </View>

        {/* TODO: mandar a mensagem e trocar pela tela de conversa quando o modelo estiver ligado. */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Pergunte sobre seu dinheiro"
            placeholderTextColor={colors.dark.text.tertiary}
          />
          <Pressable accessibilityLabel="Falar por voz">
            <Icon name="microfone" size={22} color={colors.dark.text.secondary} />
          </Pressable>
          <LinearGradient colors={gradients.icone.colors} start={gradients.icone.start} end={gradients.icone.end} style={styles.sendButton}>
            <Icon name="enviar" size={18} color={colors.dark.text.primary} />
          </LinearGradient>
        </View>
      </View>
    </KeyboardDismissView>
  );
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
  welcome: {
    alignItems: 'center',
    gap: space[14],
    paddingHorizontal: space[24],
    marginTop: space[20],
  },
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
  suggestions: {
    width: '100%',
    gap: space[10],
    paddingTop: space[12],
  },
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
  inputBar: {
    position: 'absolute',
    bottom: 116,
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
});
