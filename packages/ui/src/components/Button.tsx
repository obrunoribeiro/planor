// Botão/Primário — CONTEXTO.md §4. Node 22:110: "Ação principal da tela. Largura padrão 342
// (tela de 390 com margens de 24)." Estados: Padrão, Desabilitado, Carregando.
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { gradients } from '../theme/gradients';
import { shadows } from '../theme/shadows';
import { typography } from '../theme/typography';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ label, onPress, disabled = false, loading = false }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable onPress={onPress} disabled={isDisabled} accessibilityRole="button" accessibilityState={{ disabled: isDisabled, busy: loading }}>
      <LinearGradient
        colors={gradients.botao.colors}
        start={gradients.botao.start}
        end={gradients.botao.end}
        style={[styles.button, shadows.marca, isDisabled ? styles.disabled : null]}
      >
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.label}>{label}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    paddingHorizontal: 24,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  label: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    lineHeight: typography.labelLarge.lineHeight,
    color: '#FFFFFF',
  },
});
