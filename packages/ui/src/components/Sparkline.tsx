// Gráfico/Coluna de tendência (mini linha + área) — usado no card "Gasto do mês" da Home.
// Genérico: recebe uma série de valores e desenha a linha + preenchimento em gradiente, sem
// depender dos números de uma tela específica (CONTEXTO.md §4: "Desenhe com react-native-svg").
import { useId } from 'react';
import { Defs, LinearGradient, Path, Stop, Svg } from 'react-native-svg';
import Animated, { useAnimatedProps } from 'react-native-reanimated';
import { useRevealProgress } from '../hooks/useRevealProgress';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type SparklineProps = {
  values: number[];
  width?: number;
  height?: number;
  lineColor?: string;
  fillColor?: string;
  strokeWidth?: number;
};

export function Sparkline({
  values,
  width = 137,
  height = 64,
  lineColor = '#AEA8FF',
  fillColor = '#7C5CFF',
  strokeWidth = 1.96,
}: SparklineProps) {
  const gradientId = `sparkline-${useId()}`;
  const { progress, ref } = useRevealProgress(100);

  const hasLine = values.length >= 2;
  const max = hasLine ? Math.max(...values) : 0;
  const min = hasLine ? Math.min(...values) : 0;
  const range = max - min || 1;
  const stepX = hasLine ? width / (values.length - 1) : 0;

  const points = hasLine
    ? values.map((value, index) => {
        const x = index * stepX;
        const y = height - ((value - min) / range) * height;
        return [x, y] as const;
      })
    : [];

  const linePath = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
  const areaPath = `${linePath} L${width} ${height} L0 ${height} Z`;

  // Comprimento real do traço (soma dos segmentos retos entre pontos) — usamos isso em vez do
  // atributo SVG `pathLength` porque o react-native-svg não o suporta. Com o comprimento exato,
  // strokeDasharray/strokeDashoffset em unidades absolutas fazem a linha "se desenhar" da
  // esquerda pra direita, do mesmo jeito que o arco do Gauge e os segmentos do Donut.
  let lineLength = 0;
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    if (!previous || !current) continue;
    lineLength += Math.hypot(current[0] - previous[0], current[1] - previous[1]);
  }

  const areaAnimatedProps = useAnimatedProps(() => ({
    fillOpacity: progress.value / 100,
  }));
  const lineAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: lineLength * (1 - progress.value / 100),
  }));

  if (!hasLine) return null;

  return (
    <Animated.View ref={ref} collapsable={false}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fillColor} stopOpacity={0.55} />
            <Stop offset="1" stopColor={fillColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <AnimatedPath d={areaPath} fill={`url(#${gradientId})`} animatedProps={areaAnimatedProps} />
        <AnimatedPath
          d={linePath}
          stroke={lineColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${lineLength} ${lineLength}`}
          animatedProps={lineAnimatedProps}
        />
      </Svg>
    </Animated.View>
  );
}
