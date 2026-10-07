// Gráfico/Medidor — arco semicircular (0–100%), usado no card "Fixos x variáveis" da Home.
// Genérico: o ângulo e o raio vêm de `percent`/`size`, não de um valor fixo (CONTEXTO.md §4).
import { useId } from 'react';
import { Defs, LinearGradient, Path, Stop, Svg } from 'react-native-svg';
import Animated, { useAnimatedProps } from 'react-native-reanimated';
import { useRevealProgress } from '../hooks/useRevealProgress';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type GaugeProps = {
  /** 0 a 100. */
  percent: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  progressFrom?: string;
  progressTo?: string;
};

function arcPoint(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

/** Arco de `startAngle` a `endAngle` (graus, 0°=direita, 90°=topo, 180°=esquerda). */
function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = arcPoint(cx, cy, r, startAngle);
  const end = arcPoint(cx, cy, r, endAngle);
  const largeArc = startAngle - endAngle > 180 ? 1 : 0;
  return `M${start.x} ${start.y} A${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function Gauge({
  percent,
  size = 132,
  strokeWidth = 12,
  trackColor = '#2E2A4A',
  progressFrom = '#4F34BE',
  progressTo = '#C8C6FE',
}: GaugeProps) {
  const gradientId = `gauge-${useId()}`;
  const clamped = Math.max(0, Math.min(100, percent));
  const width = size;
  const r = width / 2 - strokeWidth / 2;
  const cx = width / 2;
  // Centro deslocado exatamente `strokeWidth/2` do fundo — a ponta arredondada do traço nunca
  // passa da borda do SVG, não importa o `size`/`strokeWidth` escolhido (antes a altura vinha de
  // uma proporção fixa do asset original e podia cortar a ponta do arco em tamanhos diferentes).
  const centerY = r + strokeWidth / 2;
  const height = r + strokeWidth;
  const arcLength = r * Math.PI; // comprimento de um arco de 180°

  const { progress, ref } = useRevealProgress(clamped);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: arcLength * (1 - progress.value / 100),
  }));

  return (
    <Animated.View ref={ref} collapsable={false}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={progressFrom} />
            <Stop offset="1" stopColor={progressTo} />
          </LinearGradient>
        </Defs>
        <Path
          d={arcPath(cx, centerY, r, 180, 0)}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
        <AnimatedPath
          d={arcPath(cx, centerY, r, 180, 0)}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${arcLength}`}
          animatedProps={animatedProps}
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}
