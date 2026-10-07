// Controle/Toggle — CONTEXTO.md §4: "48×28, roxo quando ligado." Node 109:117 no Figma.
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors } from '../theme/colors';

export type ToggleProps = {
  value: boolean;
  onValueChange?: (value: boolean) => void;
  accessibilityLabel: string;
};

const TRACK_WIDTH = 48;
const TRACK_HEIGHT = 28;
const KNOB_SIZE = 22;
const KNOB_MARGIN = 3;

export function Toggle({ value, onValueChange, accessibilityLabel }: ToggleProps) {
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(value ? colors.dark.bg.brand : colors.dark.border.strong, { duration: 150 }),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(value ? TRACK_WIDTH - KNOB_SIZE - KNOB_MARGIN : KNOB_MARGIN, { duration: 150 }) }],
  }));

  return (
    <Pressable
      onPress={() => onValueChange?.(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
    >
      <Animated.View
        style={[
          { width: TRACK_WIDTH, height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, justifyContent: 'center' },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            { width: KNOB_SIZE, height: KNOB_SIZE, borderRadius: KNOB_SIZE / 2, backgroundColor: '#FFFFFF' },
            knobStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}
