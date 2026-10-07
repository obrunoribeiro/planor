// "Sua retrospectiva chegou" — CONTEXTO.md §6.13. Node 73:2215 no Figma.
import { colors, gradients, radius, space, typography } from '@planor/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- assets de imagem no RN/Metro se referenciam com require(), não import
const previewImage = require('../../../assets/images/retrospectiva-preview.png');

export type RetrospectivaCardProps = {
  monthLabel: string;
};

export function RetrospectivaCard({ monthLabel }: RetrospectivaCardProps) {
  const glow = useSharedValue(0.25);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.25, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [glow]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    // TODO: navegar pra /retrospectiva/[month] quando essa tela existir (Fase 5, §13).
    <Pressable style={styles.touchable}>
      <Animated.View pointerEvents="none" style={[styles.glowBorder, glowStyle]} />
      <LinearGradient
        colors={gradients.retrospectiva.colors}
        locations={gradients.retrospectiva.locations}
        start={gradients.retrospectiva.start}
        end={gradients.retrospectiva.end}
        style={styles.container}
      >
        <Image source={previewImage} style={styles.preview} resizeMode="cover" />
        <View style={styles.text}>
          <Text style={styles.eyebrow}>NOVO</Text>
          <Text style={styles.title}>Sua retrospectiva de {monthLabel} chegou</Text>
          <Text style={styles.subtitle}>Veja e compartilhe nos stories</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: radius['3xl'],
  },
  glowBorder: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: radius['3xl'] + 3,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 92, 255, 0.85)',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[14],
    padding: space[16],
    borderRadius: radius['3xl'],
  },
  preview: {
    width: 44,
    height: 78,
    borderRadius: 10,
  },
  text: {
    flex: 1,
    gap: space[4],
  },
  eyebrow: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  title: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    lineHeight: typography.labelLarge.lineHeight,
    color: colors.dark.text.primary,
  },
  subtitle: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.75)',
  },
});
