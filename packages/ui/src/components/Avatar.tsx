import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { gradients } from '../theme/gradients';
import { typography } from '../theme/typography';

export type AvatarProps = {
  initials: string;
  size?: number;
  /** Gradiente de marca (padrão) ou uma cor sólida — ver nota sobre tons pendentes abaixo. */
  variant?: 'gradient' | 'solid';
  /**
   * Só usado com variant="solid". As cores roxo/rosa/verde/âmbar/azul/teal do Avatar do Figma
   * ainda não foram confirmadas como gradiente (só a roxa, via `gradients.icone`) — por isso o
   * modo sólido aceita qualquer hex, geralmente um primitive "/800" (ver packages/ui/src/theme).
   */
  color?: string;
  borderColor?: string;
};

export function Avatar({ initials, size = 40, variant = 'gradient', color = '#392594', borderColor }: AvatarProps) {
  const fontSize = size <= 30 ? typography.labelSmall.fontSize : typography.labelLarge.fontSize;
  const content = (
    <Text style={[styles.initials, { fontSize, fontFamily: typography.labelLarge.fontFamily }]}>{initials}</Text>
  );

  const containerStyle = [
    styles.container,
    { width: size, height: size, borderRadius: size / 2 },
    borderColor ? { borderWidth: 2, borderColor } : null,
  ];

  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={gradients.icone.colors}
        start={gradients.icone.start}
        end={gradients.icone.end}
        style={containerStyle}
      >
        {content}
      </LinearGradient>
    );
  }

  return <View style={[...containerStyle, { backgroundColor: color }]}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
  },
});
