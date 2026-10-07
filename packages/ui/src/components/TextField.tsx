// Formulário/Input — CONTEXTO.md §4. Estados: Padrão, Foco, Preenchido, Erro, Desabilitado.
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { colors } from '../theme/colors';
import { radius, space } from '../theme/tokens';
import { typography } from '../theme/typography';

export type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoFocus?: boolean;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  disabled = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoFocus = false,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.dark.text.error : focused ? colors.dark.border.brand : colors.dark.border.default;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, { borderColor, borderWidth: focused || error ? 1.5 : 1 }, disabled ? styles.disabled : null]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.dark.text.tertiary}
          editable={!disabled}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: space[8],
  },
  label: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.dark.text.secondary,
  },
  field: {
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: space[16],
    borderRadius: radius.xl,
    backgroundColor: colors.dark.bg.surface,
  },
  disabled: {
    opacity: 0.5,
  },
  input: {
    fontFamily: typography.bodyLarge.fontFamily,
    fontSize: typography.bodyLarge.fontSize,
    color: colors.dark.text.primary,
    padding: 0,
  },
  error: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.error,
  },
});
