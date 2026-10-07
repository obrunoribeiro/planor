import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/tokens';
import { typography } from '../theme/typography';

export type BadgeTone = 'brand' | 'success' | 'alert' | 'error' | 'neutro' | 'glass';

export type BadgeProps = {
  label: string;
  tone?: BadgeTone;
};

const toneStyles: Record<BadgeTone, { bg: string; text: string; border?: string }> = {
  brand: { bg: colors.dark.bg.brandSubtle, text: colors.dark.text.brand },
  success: { bg: colors.dark.bg.successSubtle, text: colors.dark.text.success },
  alert: { bg: colors.dark.bg.alertSubtle, text: colors.dark.text.alert },
  error: { bg: colors.dark.bg.errorSubtle, text: colors.dark.text.error },
  neutro: { bg: colors.dark.bg.control, text: colors.dark.text.secondary },
  // Tom usado sobre fundos em gradiente (cabeçalho da Home) — precisa de transparência pra
  // funcionar em cima de qualquer cor, não é um token semântico do Color (capturado ao vivo
  // no get_design_context da Home, não é um Selo com variável nomeada no Figma).
  glass: { bg: 'rgba(11, 10, 18, 0.35)', text: colors.dark.text.brand, border: 'rgba(200, 198, 254, 0.35)' },
};

export function Badge({ label, tone = 'neutro' }: BadgeProps) {
  const t = toneStyles[tone];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: t.bg },
        t.border ? { borderWidth: 1, borderColor: t.border } : null,
      ]}
    >
      <Text style={[styles.label, { color: t.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  label: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
  },
});
