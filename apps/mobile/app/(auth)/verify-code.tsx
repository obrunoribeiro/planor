// Onboarding · 5 Código de verificação — CONTEXTO.md §6.1. Node 41:792 no Figma. Compartilhada
// entre cadastro e login (ver CONTEXTO.md §5).
import { Button, CodeInput, colors, GlowOrb, Icon, space, typography } from '@planor/ui';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { useAuth } from '@/lib/auth/AuthProvider';
import { goBack } from '@/lib/navigation';

const RESEND_SECONDS = 60;
// O Supabase desse projeto está configurado pra gerar código de 8 dígitos (o padrão da
// plataforma costuma ser 6 — isso é um ajuste de projeto, ver Authentication → Providers →
// Email no painel do Supabase se quiser voltar pra 6 e bater com o design original do Figma).
const CODE_LENGTH = 8;

export default function VerifyCodeScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp, signInWithOtp } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const onConfirm = async () => {
    if (!email || code.length < CODE_LENGTH) return;
    setError(undefined);
    setLoading(true);
    const { error: authError } = await verifyOtp(email, code);
    setLoading(false);
    if (authError) {
      setError('Código incorreto ou vencido. Confira e tente de novo.');
      return;
    }
    // A sessão muda via onAuthStateChange — o gate do _layout raiz redireciona pra Home sozinho.
  };

  const onResend = async () => {
    if (!email || secondsLeft > 0) return;
    setSecondsLeft(RESEND_SECONDS);
    await signInWithOtp(email);
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
            <Text style={styles.title}>Digite o código</Text>
            <Text style={styles.subtitle}>
              Enviamos {CODE_LENGTH} dígitos para <Text style={styles.subtitleStrong}>{email}</Text>. Ele vale por 10
              minutos.
            </Text>
          </View>

          <CodeInput length={CODE_LENGTH} value={code} onChangeText={setCode} />
          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>
              {secondsLeft > 0 ? `Reenviar código em 0:${String(secondsLeft).padStart(2, '0')}` : 'Não recebeu?'}
            </Text>
            <Pressable onPress={onResend} disabled={secondsLeft > 0}>
              <Text style={[styles.resendAction, secondsLeft > 0 ? styles.resendActionDisabled : null]}>Reenviar código</Text>
            </Pressable>
          </View>

          <View style={styles.spacer} />

          <Button label="Confirmar" onPress={onConfirm} loading={loading} disabled={code.length < CODE_LENGTH} />
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
    lineHeight: typography.bodyMedium.lineHeight,
    color: colors.dark.text.secondary,
  },
  subtitleStrong: { color: colors.dark.text.primary },
  error: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.error,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
  },
  resendLabel: {
    flex: 1,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: 18,
    color: colors.dark.text.tertiary,
  },
  resendAction: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    color: colors.dark.text.brand,
  },
  resendActionDisabled: {
    opacity: 0.4,
  },
  spacer: { flex: 1 },
});
