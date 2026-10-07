// Formulário/Dígito do código — CONTEXTO.md §6.1: "código por e-mail." Um TextInput
// invisível captura a digitação; os quadrados (quantidade = length) só mostram o resultado.
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius, space } from '../theme/tokens';
import { typography } from '../theme/typography';

export type CodeInputProps = {
  length?: number;
  value: string;
  onChangeText: (text: string) => void;
  autoFocus?: boolean;
};

export function CodeInput({ length = 6, value, onChangeText, autoFocus = true }: CodeInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');
  const activeIndex = Math.min(value.length, length - 1);

  // Terminou de digitar — fecha o teclado sozinho, não precisa o usuário tocar fora.
  useEffect(() => {
    if (value.length === length) {
      inputRef.current?.blur();
      Keyboard.dismiss();
    }
  }, [value.length, length]);

  return (
    <Pressable style={styles.row} onPress={() => inputRef.current?.focus()}>
      {digits.map((digit, index) => {
        const isActive = focused && index === activeIndex;
        return (
          <View
            key={index}
            style={[
              styles.box,
              digit ? styles.boxFilled : null,
              isActive ? styles.boxActive : null,
            ]}
          >
            {isActive && !digit ? <View style={styles.cursor} /> : <Text style={styles.digit}>{digit}</Text>}
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space[8],
    width: '100%',
  },
  box: {
    flex: 1,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.dark.border.strong,
    backgroundColor: colors.dark.bg.surface,
  },
  boxFilled: {
    borderColor: colors.dark.border.strong,
  },
  boxActive: {
    borderWidth: 1.5,
    borderColor: colors.dark.border.brand,
  },
  digit: {
    fontFamily: typography.numberLarge.fontFamily,
    fontSize: typography.numberLarge.fontSize,
    lineHeight: typography.numberLarge.lineHeight,
    letterSpacing: typography.numberLarge.letterSpacing,
    color: colors.dark.text.primary,
  },
  cursor: {
    width: 2,
    height: 24,
    borderRadius: 1,
    backgroundColor: colors.dark.text.brand,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
