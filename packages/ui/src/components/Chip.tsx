// Chip — padrão ou ativo (CONTEXTO.md §4, componente "Chip" da página Componentes do Figma).
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';
import { gradients } from '../theme/gradients';
import { typography } from '../theme/typography';

export type ChipProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export function Chip({ label, active = false, onPress }: ChipProps) {
  if (active) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: true }}>
        <LinearGradient
          colors={gradients.chipAtivo.colors}
          start={gradients.chipAtivo.start}
          end={gradients.chipAtivo.end}
          style={styles.chip}
        >
          <Text style={[styles.label, { color: colors.dark.text.primary }]}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: false }}
      style={[styles.chip, styles.inactive]}
    >
      <Text style={[styles.label, { color: colors.dark.text.secondary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactive: {
    backgroundColor: colors.dark.bg.surface,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
  },
  label: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
  },
});
