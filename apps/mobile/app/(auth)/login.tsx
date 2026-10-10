// Onboarding · Entrar (quem já tem conta) — CONTEXTO.md §6.1.
import { Button, colors, GlowOrb, Icon, space, TextField, typography } from '@planor/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { useAuth } from '@/lib/auth/AuthProvider';
import { goBack } from '@/lib/navigation';

export default function LoginScreen() {
  const { signInWithOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
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
          <Pressable onPress={() => goBack('/welcome')} style={styles.backButton} accessibilityLabel="Voltar">
            <Icon name="voltar" size={20} color={colors.dark.text.primary} />
          </Pressable>

          <View style={styles.texts}>
            <Text style={styles.title}>Entrar</Text>
            <Text style={styles.subtitle}>Mandamos um código pro seu e-mail. Sem senha.</Text>
          </View>

          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="bruno@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={error}
            autoFocus
          />

          <View style={styles.spacer} />

          <Button label="Enviar código" onPress={onSubmit} loading={loading} disabled={!email} />
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
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.surface,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
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
  spacer: { flex: 1 },
});
