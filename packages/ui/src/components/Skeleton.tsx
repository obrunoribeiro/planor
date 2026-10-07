// Skeleton — CONTEXTO.md §4 e §3 (princípio 8: "toda tela tem 4 estados: carregando...").
// Node 110:290 no Figma: 3 formas (Linha 160×12, Círculo 44×44, Bloco 302×80), gradiente
// #1E1D24 → #2A2931 (50%) → #1E1D24. Aqui o gradiente pulsa (opacidade) pra dar a sensação de
// carregamento — o Figma é estático, a animação é nossa.
import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export type SkeletonShape = 'linha' | 'circulo' | 'bloco';

export type SkeletonProps = {
  shape?: SkeletonShape;
  width?: DimensionValue;
};

const SHAPE_STYLE: Record<SkeletonShape, { width: number; height: number; borderRadius: number }> = {
  linha: { width: 160, height: 12, borderRadius: 6 },
  circulo: { width: 44, height: 44, borderRadius: 22 },
  bloco: { width: 302, height: 80, borderRadius: 16 },
};

export function Skeleton({ shape = 'linha', width }: SkeletonProps) {
  const base = SHAPE_STYLE[shape];
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.6, { duration: 700 })), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.container,
        { height: base.height, width: width ?? base.width, borderRadius: base.borderRadius },
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={['#1E1D24', '#2A2931', '#1E1D24']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

// Fallback não-animado, caso algum dia precise sem o Reanimated em contexto (ex.: SSR/testes).
export function SkeletonStatic({ shape = 'linha', width }: SkeletonProps) {
  const base = SHAPE_STYLE[shape];
  return <View style={{ height: base.height, width: width ?? base.width, borderRadius: base.borderRadius, backgroundColor: '#2A2931' }} />;
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
