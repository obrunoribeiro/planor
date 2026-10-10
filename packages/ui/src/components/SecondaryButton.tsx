// Botão/Secundário — ação de apoio ao lado (ou abaixo) da principal. Instância 53:1347 no Figma
// ("Atualizar agora" na tela Conexão): fundo de superfície, borda forte, ícone opcional + rótulo.
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Icon, type IconName } from '../icons';
import { colors } from '../theme/colors';
import { space } from '../theme/tokens';
import { typography } from '../theme/typography';

export type SecondaryButtonProps = {
  label: string;
  icon?: IconName;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function SecondaryButton({ label, icon, onPress, disabled = false, loading = false }: SecondaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[styles.button, isDisabled ? styles.disabled : null]}
    >
      {loading ? (
        <ActivityIndicator color={colors.dark.text.primary} />
      ) : (
        <>
          {icon && <Icon name={icon} size={18} color={colors.dark.text.primary} />}
          <Text style={styles.label}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.dark.border.strong,
    backgroundColor: colors.dark.bg.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[8],
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
});
