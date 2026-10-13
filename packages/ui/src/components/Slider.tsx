// Controle/Slider — sheet "Criar limite" (Figma 46:951): trilho de 6 px (border.strong),
// preenchimento com o gradiente de progresso e controle branco de 28 px com borda roxa de 4 px.
// Arrasta ou toca no trilho; o valor anda em passos (`step`).
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { primitives } from '../theme/primitives';
import { gradients } from '../theme/gradients';

export type SliderProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
  accessibilityLabel: string;
};

const THUMB = 28;
const TRACK = 6;

export function Slider({ value, min, max, step, onValueChange, accessibilityLabel }: SliderProps) {
  const [width, setWidth] = useState(0);
  const position = useSharedValue(0);
  const usable = Math.max(1, width - THUMB);

  useEffect(() => {
    position.value = ((Math.min(max, Math.max(min, value)) - min) / (max - min)) * usable;
  }, [value, min, max, usable, position]);

  const emit = (x: number) => {
    const ratio = Math.min(1, Math.max(0, x / usable));
    const raw = min + ratio * (max - min);
    onValueChange(Math.min(max, Math.max(min, Math.round(raw / step) * step)));
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      position.value = Math.min(usable, Math.max(0, e.x - THUMB / 2));
      runOnJS(emit)(position.value);
    })
    .onUpdate((e) => {
      position.value = Math.min(usable, Math.max(0, e.x - THUMB / 2));
      runOnJS(emit)(position.value);
    });

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: position.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: position.value + THUMB / 2 }));

  // Raiz própria: dentro de um Modal (os sheets), o gesto não chega na raiz do app.
  return (
    <GestureHandlerRootView>
      <GestureDetector gesture={pan}>
        <View
          style={styles.container}
          onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={accessibilityLabel}
          accessibilityValue={{ min, max, now: value }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            const next = e.nativeEvent.actionName === 'increment' ? value + step : value - step;
            onValueChange(Math.min(max, Math.max(min, next)));
          }}
        >
          <View style={styles.track} />
          <Animated.View style={[styles.fill, fillStyle]}>
            <LinearGradient
              colors={gradients.progresso.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { height: THUMB, justifyContent: 'center' },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TRACK,
    borderRadius: TRACK / 2,
    backgroundColor: colors.dark.border.strong,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: TRACK,
    borderRadius: TRACK / 2,
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 4,
    borderColor: colors.dark.border.brand,
    backgroundColor: primitives.neutral[0],
  },
});
