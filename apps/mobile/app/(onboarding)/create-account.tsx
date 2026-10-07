// Onboarding · 4 Criar conta — CONTEXTO.md §6.1. Node 36:755 no Figma.
import { Button, colors, GlowOrb, OnboardingHeader, space, TextField, typography } from '@planor/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { useAuth } from '@/lib/auth/AuthProvider';

export default function CreateAccountScreen() {
  const { signInWithOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const onSubmitEmail = async () => {
    setError(undefined);
    if (!email.includes('@')) {
      setError('Digite um e-mail válido.');
      return;
    }
    setLoading(true);
    const { error: authError } = await signInWithOtp(email.trim().toLowerCase());
    setLoading(false);
    if (authError) {
      setError(authError);
      return;
    }
    router.push({ pathname: '/verify-code', params: { email: email.trim().toLowerCase() } });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.glow} pointerEvents="none">
        <GlowOrb width={520} height={420} color="#7C5CFF" />
      </View>

      <KeyboardDismissView>
        <View style={styles.content}>
          <OnboardingHeader step={3} totalSteps={5} onBack={() => router.back()} />

          <View style={styles.texts}>
            <Text style={styles.title}>Crie sua conta</Text>
            <Text style={styles.subtitle}>Seu plano fica salvo e sincronizado entre seus aparelhos. Sem cartão de crédito.</Text>
          </View>

          <View style={styles.socialButtons}>
            {/* TODO: Apple/Google exigem credenciais nativas (Apple Developer, Google Cloud) que
                ainda não existem — ver CONTEXTO.md §15. Por enquanto só o e-mail funciona de verdade. */}
            <Pressable style={styles.appleButton}>
              <Text style={styles.appleButtonLabel}>Continuar com Apple</Text>
            </Pressable>
            <Pressable style={styles.googleButton}>
              <Text style={styles.googleButtonLabel}>Continuar com Google</Text>
            </Pressable>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>ou com e-mail</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="bruno@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={error}
          />

          <View style={styles.spacer} />

          <Button label="Continuar com e-mail" onPress={onSubmitEmail} loading={loading} disabled={!email} />

          <Text style={styles.legal}>
            Ao continuar, você aceita os <Text style={styles.legalLink}>Termos de uso</Text> e a{' '}
            <Text style={styles.legalLink}>Política de privacidade</Text>.
          </Text>
        </View>
      </KeyboardDismissView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  glow: { position: 'absolute', top: -120, left: -60 },
  content: {
    flex: 1,
    gap: space[20],
    paddingHorizontal: space[24],
    paddingBottom: space[40],
  },
  texts: { gap: space[8], paddingTop: space[8] },
  title: {
    fontFamily: typography.h1.fontFamily,
    fontSize: typography.h1.fontSize,
    lineHeight: typography.h1.lineHeight,
    letterSpacing: typography.h1.letterSpacing,
    color: colors.dark.text.primary,
  },
  subtitle: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    color: colors.dark.text.secondary,
  },
  socialButtons: { gap: space[12] },
  appleButton: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },
  appleButtonLabel: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    color: colors.dark.text.inverse,
  },
  googleButton: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.dark.border.strong,
    backgroundColor: colors.dark.bg.surface,
  },
  googleButtonLabel: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    color: colors.dark.text.primary,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.dark.border.default },
  dividerLabel: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  spacer: { flex: 1 },
  legal: {
    textAlign: 'center',
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  legalLink: { color: colors.dark.text.brand },
});
