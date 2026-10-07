// Estado vazio — CONTEXTO.md §4 e §3 (princípio 8). Node 112:275 no Figma.
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from './Button';
import { Icon, type IconName } from '../icons';
import { colors } from '../theme/colors';
import { gradients } from '../theme/gradients';
import { space } from '../theme/tokens';
import { typography } from '../theme/typography';

export type EmptyStateProps = {
  icon?: IconName;
  customIcon?: ReactNode;
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon = 'meta', customIcon, title, text, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.ring}>
        <LinearGradient colors={gradients.icone.colors} start={gradients.icone.start} end={gradients.icone.end} style={styles.center}>
          {customIcon ?? <Icon name={icon} size={36} color={colors.dark.text.primary} />}
        </LinearGradient>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
      {actionLabel && <Button label={actionLabel} onPress={onAction} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: space[16],
  },
  ring: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 92, 255, 0.1)',
  },
  center: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.h2.fontFamily,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.22,
    textAlign: 'center',
    color: colors.dark.text.primary,
  },
  text: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    lineHeight: typography.bodyMedium.lineHeight,
    textAlign: 'center',
    color: colors.dark.text.secondary,
  },
});
