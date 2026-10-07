// "Brilho" radial — elipse com gradiente radial, usada no topo das telas e em banners
// (CONTEXTO.md §4: "Brilho de fundo: elipse com gradiente radial roxo, 30% → 0%, no topo das
// telas"). Confirmados ao vivo: o brilho do cabeçalho da Home (#9385FF a 45%, 2 stops, círculo),
// o do banner Pro (#E0E0FF a 45%, 2 stops, círculo) e o do topo de Gastos (#7C5CFF, 3 stops —
// 35% → 12,25% em 55% → 0%, elipse 630×480).
import { useId } from 'react';
import { Defs, Ellipse, RadialGradient, Stop, Svg } from 'react-native-svg';

export type GlowStop = {
  offset: number;
  opacity: number;
};

export type GlowOrbProps = {
  width: number;
  height?: number;
  color: string;
  /** Padrão: 2 stops (opacity → 0). Para o brilho de 3 stops de Gastos, passe os 3 aqui. */
  stops?: GlowStop[];
};

export function GlowOrb({ width, height, color, stops }: GlowOrbProps) {
  const gradientId = `glow-${useId()}`;
  const h = height ?? width;
  const resolvedStops = stops ?? [
    { offset: 0, opacity: 0.45 },
    { offset: 1, opacity: 0 },
  ];

  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
      <Defs>
        <RadialGradient id={gradientId} cx="50%" cy="50%" rx="50%" ry="50%">
          {resolvedStops.map((stop, index) => (
            <Stop key={index} offset={stop.offset} stopColor={color} stopOpacity={stop.opacity} />
          ))}
        </RadialGradient>
      </Defs>
      <Ellipse cx={width / 2} cy={h / 2} rx={width / 2} ry={h / 2} fill={`url(#${gradientId})`} />
    </Svg>
  );
}
