import { Path, Svg } from 'react-native-svg';
import { icons, type IconName } from './registry';

export type IconProps = {
  name: IconName;
  /** Tamanho do lado maior do ícone, em px. O outro lado escala mantendo a proporção original. */
  size?: number;
  color?: string;
};

export function Icon({ name, size = 24, color = '#FFFFFF' }: IconProps) {
  const icon = icons[name];
  const scale = size / Math.max(icon.width, icon.height);
  const width = icon.width * scale;
  const height = icon.height * scale;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${icon.width} ${icon.height}`} fill="none">
      {icon.paths.map((path, index) => (
        <Path
          key={index}
          d={path.d}
          stroke={path.fill ? undefined : color}
          fill={path.fill ? color : 'none'}
          strokeWidth={icon.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
