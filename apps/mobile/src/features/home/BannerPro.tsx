// Banner Pro — CONTEXTO.md §6.15. Node 25:300 no Figma. Só aparece no plano Grátis — o index.tsx
// (Home) só renderiza esse componente quando `user.plan === 'free'`.
import { Badge, colors, gradients, GlowOrb, radius, space, typography } from '@planor/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export function BannerPro() {
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [drift]);

  const glowStyleA = useAnimatedStyle(() => ({
    transform: [{ translateX: -30 + drift.value * 60 }, { translateY: -16 + drift.value * 20 }],
  }));
  const glowStyleB = useAnimatedStyle(() => ({
    transform: [{ translateX: 24 - drift.value * 48 }, { translateY: 12 - drift.value * 16 }],
    opacity: 0.45 + drift.value * 0.35,
  }));

  return (
    <LinearGradient
      colors={gradients.bannerPro.colors}
      locations={gradients.bannerPro.locations}
      start={gradients.bannerPro.start}
      end={gradients.bannerPro.end}
      style={styles.container}
    >
      <Animated.View style={[styles.glow, glowStyleA]} pointerEvents="none">
        <GlowOrb width={220} color="#E0E0FF" />
      </Animated.View>
      <Animated.View style={[styles.glowSecondary, glowStyleB]} pointerEvents="none">
        <GlowOrb width={160} color="#7C5CFF" />
      </Animated.View>

      <Badge tone="neutro" label="Planor Pro" />
      <Text style={styles.headline}>Pergunte à IA pelo WhatsApp e conecte quantos bancos quiser</Text>
      {/* TODO: navegar pra /paywall quando a tela existir (Fase 4, §13). */}
      <Pressable style={styles.button}>
        <Text style={styles.buttonLabel}>Testar 7 dias grátis</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space[14],
    paddingHorizontal: space[20],
    paddingVertical: 22,
    borderRadius: radius['4xl'],
    borderWidth: 1,
    borderColor: 'rgba(200, 198, 254, 0.35)',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -61,
    left: 189,
  },
  glowSecondary: {
    position: 'absolute',
    bottom: -50,
    left: -30,
  },
  headline: {
    fontFamily: typography.display.fontFamily,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.22,
    color: colors.dark.text.primary,
  },
  button: {
    height: 44,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[20],
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },
  buttonLabel: {
    fontFamily: typography.h3.fontFamily,
    fontSize: 15,
    color: '#25176C',
  },
});
