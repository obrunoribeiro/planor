import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { useRevealProgress } from '../hooks/useRevealProgress';

export type ProgressSegment = {
  /** 0 a 100. A soma dos segmentos pode ser menor que 100 — o resto fica com a cor da trilha. */
  percent: number;
  color: string;
};

export type ProgressBarProps = {
  segments: ProgressSegment[];
  height?: number;
  trackColor?: string;
  gap?: number;
};

function ProgressSegmentFill({
  percent,
  color,
  height,
  progress,
}: {
  percent: number;
  color: string;
  height: number;
  progress: SharedValue<number>;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const style = useAnimatedStyle(() => ({
    width: `${clamped * (progress.value / 100)}%`,
  }));

  return <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: color }, style]} />;
}

export function ProgressBar({ segments, height = 6, trackColor = colors.dark.bg.control, gap = 2 }: ProgressBarProps) {
  const { progress, ref } = useRevealProgress(100);

  return (
    <Animated.View
      ref={ref}
      collapsable={false}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor, gap }]}
    >
      {segments.map((segment, index) => (
        <ProgressSegmentFill key={index} percent={segment.percent} color={segment.color} height={height} progress={progress} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    width: '100%',
    overflow: 'hidden',
  },
});
