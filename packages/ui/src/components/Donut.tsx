// Gráfico/Rosca — usado no resumo de Gastos (CONTEXTO.md §6.5). Genérico: desenha cada
// segmento com a técnica de strokeDasharray sobre círculos concêntricos, a partir de uma lista
// de { percent, color } — nenhum valor fixo de uma tela específica.
import { useId } from 'react';
import { Circle, G, Svg } from 'react-native-svg';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import { useRevealProgress } from '../hooks/useRevealProgress';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type DonutSegment = {
  percent: number;
  color: string;
};

export type DonutProps = {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
};

function DonutSegmentArc({
  size,
  strokeWidth,
  color,
  cumulativeStart,
  segmentLength,
  circumference,
  progress,
}: {
  size: number;
  strokeWidth: number;
  color: string;
  cumulativeStart: number;
  segmentLength: number;
  circumference: number;
  progress: SharedValue<number>;
}) {
  // A rosca inteira "desenha" junto, em sequência ao redor do anel: cada segmento só começa a
  // aparecer quando o avanço global (0→circumference) alcança o ponto em que ele começa.
  const animatedProps = useAnimatedProps(() => {
    const revealed = (progress.value / 100) * circumference;
    const visible = Math.max(0, Math.min(segmentLength, revealed - cumulativeStart));
    return { strokeDasharray: `${visible} ${circumference - visible}` };
  });

  return (
    <AnimatedCircle
      cx={size / 2}
      cy={size / 2}
      r={(size - strokeWidth) / 2}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDashoffset={-cumulativeStart}
      strokeLinecap="butt"
      fill="none"
      animatedProps={animatedProps}
    />
  );
}

export function Donut({ segments, size = 132, strokeWidth = 16, trackColor }: DonutProps) {
  const uid = useId();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const { progress, ref } = useRevealProgress(100);

  let cumulativePercent = 0;
  const prepared = segments.map((segment) => {
    const cumulativeStart = (cumulativePercent / 100) * circumference;
    const segmentLength = (segment.percent / 100) * circumference;
    cumulativePercent += segment.percent;
    return { ...segment, cumulativeStart, segmentLength };
  });

  return (
    <Animated.View ref={ref} collapsable={false}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {trackColor && (
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        )}
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          {prepared.map((segment, index) => (
            <DonutSegmentArc
              key={`${uid}-${index}`}
              size={size}
              strokeWidth={strokeWidth}
              color={segment.color}
              cumulativeStart={segment.cumulativeStart}
              segmentLength={segment.segmentLength}
              circumference={circumference}
              progress={progress}
            />
          ))}
        </G>
      </Svg>
    </Animated.View>
  );
}
