// Navegação/Header — CONTEXTO.md §4. Node 27:220: "Topo das telas internas: voltar, título
// centralizado e uma ação opcional."
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../icons';
import { colors } from '../theme/colors';
import { space } from '../theme/tokens';
import { typography } from '../theme/typography';

export type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  action?: ReactNode;
};

export function ScreenHeader({ title, onBack, action }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.button} accessibilityLabel="Voltar">
          <Icon name="voltar" size={20} color={colors.dark.text.primary} />
        </Pressable>
      ) : (
        <View style={styles.buttonPlaceholder} />
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.buttonPlaceholder}>{action}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
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
  buttonPlaceholder: {
    width: 48,
    height: 48,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.h3.fontFamily,
    fontSize: typography.h3.fontSize,
    lineHeight: typography.h3.lineHeight,
    letterSpacing: typography.h3.letterSpacing,
    color: colors.dark.text.primary,
  },
});
