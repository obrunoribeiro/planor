// Lista/Item — CONTEXTO.md §4. "Final": Seta, Valor, Toggle, Nenhum. Aqui cobrimos Seta e Valor
// (os mais usados) com um slot `right` livre pra qualquer outra coisa (badge, toggle...).
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../icons';
import type { IconName } from '../icons';
import { colors } from '../theme/colors';
import { space } from '../theme/tokens';
import { typography } from '../theme/typography';

export type ListItemProps = {
  icon: IconName;
  title: string;
  value?: string;
  right?: ReactNode;
  showChevron?: boolean;
  last?: boolean;
  danger?: boolean;
  onPress?: () => void;
};

export function ListItem({ icon, title, value, right, showChevron = true, last = false, danger = false, onPress }: ListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, last ? styles.rowNoBorder : null]}
      accessibilityRole="button"
    >
      <View style={[styles.iconBox, danger ? styles.iconBoxDanger : null]}>
        <Icon name={icon} size={15.3} color={danger ? colors.dark.text.error : colors.dark.text.secondary} />
      </View>
      <Text style={[styles.title, danger ? styles.titleDanger : null]}>{title}</Text>
      {value && <Text style={styles.value}>{value}</Text>}
      {right}
      {showChevron && <Icon name="seta-direita" size={16} color={colors.dark.text.tertiary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    height: 56,
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border.default,
  },
  rowNoBorder: {
    borderBottomWidth: 0,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.border.default,
  },
  iconBoxDanger: {
    backgroundColor: colors.dark.bg.errorSubtle,
  },
  title: {
    flex: 1,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  titleDanger: {
    color: colors.dark.text.error,
  },
  value: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
});
