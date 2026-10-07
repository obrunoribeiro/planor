// Onboarding · 1 Boas-vindas — CONTEXTO.md §6.1. Node 23:2 no Figma.
import { Button, colors, gradients, GlowOrb, Logo, LogoHorizontal, space, typography } from '@planor/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function FloatingCard({ label, value, style }: { label: string; value: string; style?: object }) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.glow} pointerEvents="none">
        <GlowOrb width={630} height={560} color="#7C5CFF" />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <LogoHorizontal height={24} />
          <Pressable onPress={() => router.push('/login')}>
            <Text style={styles.loginLink}>Já tenho conta</Text>
          </Pressable>
        </View>

        <View style={styles.illustration}>
          <LinearGradient
            colors={gradients.marcaProfundo.colors}
            start={gradients.marcaProfundo.start}
            end={gradients.marcaProfundo.end}
            style={styles.orbit}
          >
            <Logo size={64} />
          </LinearGradient>

          <FloatingCard label="Assinatura · marcada sem uso" value="Streaming · R$ 39,90" style={styles.cardTopLeft} />
          <FloatingCard label="Parcela 3 de 10" value="Celular · R$ 240,00" style={styles.cardMidRight} />
          <View style={[styles.card, styles.cardBottomLeft, styles.cardRow]}>
            <View style={styles.dot} />
            <Text style={styles.cardValue}>Sobra prevista: R$ 1.248,90</Text>
          </View>
        </View>

        <View style={styles.texts}>
          <Text style={styles.title}>Saiba hoje quanto sobra no fim do mês</Text>
          <Text style={styles.subtitle}>
            Conecte seus bancos e o Planor organiza parcelas, assinaturas e gastos, e avisa antes do aperto.
          </Text>
        </View>

        <View style={styles.spacer} />

        <View style={styles.pagination}>
          <View style={[styles.dotPage, styles.dotPageActive]} />
          <View style={styles.dotPage} />
          <View style={styles.dotPage} />
          <View style={styles.dotPage} />
        </View>

        {/* TODO: a próxima tela (Sentimento) não foi construída ainda — por ora vai direto pra
            Criar conta, que é o essencial da Fase 2 (§13). */}
        <Button label="Começar" onPress={() => router.push('/create-account')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  glow: { position: 'absolute', top: -20, left: -120 },
  content: {
    flex: 1,
    paddingHorizontal: space[24],
    paddingBottom: space[40],
    gap: space[8],
  },
  topRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loginLink: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    color: colors.dark.text.brand,
  },
  illustration: {
    height: 380,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbit: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.45,
    shadowRadius: 40,
    elevation: 20,
  },
  card: {
    position: 'absolute',
    gap: space[2],
    paddingHorizontal: space[14],
    paddingVertical: space[12],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: colors.dark.bg.surface,
  },
  cardTopLeft: { top: 8, left: 0 },
  cardMidRight: { top: 156, right: 0 },
  cardBottomLeft: { top: 236, left: 0 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: space[10] },
  cardLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.secondary,
  },
  cardValue: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    color: colors.dark.text.primary,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dark.text.success },
  texts: {
    gap: space[12],
    paddingTop: space[8],
  },
  title: {
    fontFamily: typography.display.fontFamily,
    fontSize: typography.display.fontSize,
    lineHeight: typography.display.lineHeight,
    letterSpacing: typography.display.letterSpacing,
    color: colors.dark.text.primary,
  },
  subtitle: {
    fontFamily: typography.bodyLarge.fontFamily,
    fontSize: typography.bodyLarge.fontSize,
    lineHeight: typography.bodyLarge.lineHeight,
    color: colors.dark.text.secondary,
  },
  spacer: { flex: 1 },
  pagination: {
    flexDirection: 'row',
    gap: space[6],
    justifyContent: 'center',
    paddingBottom: space[20],
  },
  dotPage: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dark.border.strong },
  dotPageActive: { width: 24, backgroundColor: '#9385FF' },
});
