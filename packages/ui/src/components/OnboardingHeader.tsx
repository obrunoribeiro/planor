// Onboarding/Cabeçalho — CONTEXTO.md §6.1: "A barra de progresso do onboarding tem 5 passos."
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '../icons';
import { colors } from '../theme/colors';
import { gradients } from '../theme/gradients';
import { space } from '../theme/tokens';

export type OnboardingHeaderProps = {
  step: number;
  totalSteps?: number;
  onBack?: () => void;
};

export function OnboardingHeader({ step, totalSteps = 5, onBack }: OnboardingHeaderProps) {
  const pct = Math.max(0, Math.min(100, (step / totalSteps) * 100));

  return (
    <View style={styles.row}>
      <Pressable onPress={onBack} style={styles.button} accessibilityLabel="Voltar">
        <Icon name="voltar" size={20} color={colors.dark.text.primary} />
      </Pressable>
      <View style={styles.track}>
        <LinearGradient
          colors={gradients.progresso.colors}
          start={gradients.progresso.start}
          end={gradients.progresso.end}
          style={[styles.fill, { width: `${pct}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[16],
    height: 48,
    width: '100%',
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.surface,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.dark.bg.elevated,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
});
