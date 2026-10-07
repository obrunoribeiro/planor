import { Pressable, StyleSheet } from 'react-native';
import { Icon } from '../icons';
import { colors } from '../theme/colors';
import { radius, size as sizeTokens } from '../theme/tokens';

export type CheckboxProps = {
  checked: boolean;
  onPress?: () => void;
  accessibilityLabel: string;
};

export function Checkbox({ checked, onPress, accessibilityLabel }: CheckboxProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={[styles.box, checked ? styles.checked : styles.unchecked]}
    >
      {checked && <Icon name="check" size={sizeTokens.iconXs} color={colors.dark.text.onBrand} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: {
    backgroundColor: colors.dark.bg.brand,
  },
  unchecked: {
    borderWidth: 2,
    borderColor: colors.dark.border.strong,
  },
});
