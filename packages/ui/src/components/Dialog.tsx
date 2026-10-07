// Diálogo — CONTEXTO.md §4: "diálogos centrais para confirmações destrutivas (ocultar, sair,
// excluir, desconectar)." Node 112:250 no Figma, 4 tons: Alerta, Erro, Marca, Sucesso.
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../icons';
import { colors } from '../theme/colors';
import { radius, space } from '../theme/tokens';
import { typography } from '../theme/typography';

export type DialogTone = 'alerta' | 'erro' | 'marca' | 'sucesso';

const TONE: Record<DialogTone, { bg: string; iconColor: string; icon: IconName; confirmBg: string; confirmText: string }> = {
  alerta: { bg: colors.dark.bg.alertSubtle, iconColor: colors.dark.text.alert, icon: 'aviso', confirmBg: colors.dark.bg.errorSubtle, confirmText: colors.dark.text.error },
  erro: { bg: colors.dark.bg.errorSubtle, iconColor: colors.dark.text.error, icon: 'aviso', confirmBg: colors.dark.bg.errorSubtle, confirmText: colors.dark.text.error },
  marca: { bg: colors.dark.bg.brandSubtle, iconColor: colors.dark.text.brand, icon: 'ajuda', confirmBg: colors.dark.bg.brand, confirmText: colors.dark.text.onBrand },
  sucesso: { bg: colors.dark.bg.successSubtle, iconColor: colors.dark.text.success, icon: 'check', confirmBg: colors.dark.bg.brand, confirmText: colors.dark.text.onBrand },
};

export type DialogProps = {
  visible: boolean;
  tone?: DialogTone;
  title: string;
  text: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
};

export function Dialog({ visible, tone = 'alerta', title, text, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm, onCancel }: DialogProps) {
  const t = TONE[tone];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.scrim} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.iconCircle, { backgroundColor: t.bg }]}>
            <Icon name={t.icon} size={26} color={t.iconColor} />
          </View>
          <View style={styles.texts}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.text}>{text}</Text>
          </View>
          <View style={styles.actions}>
            <Pressable style={[styles.confirmButton, { backgroundColor: t.confirmBg }]} onPress={onConfirm}>
              <Text style={[styles.confirmLabel, { color: t.confirmText }]}>{confirmLabel}</Text>
            </Pressable>
            {onCancel && (
              <Pressable style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelLabel}>{cancelLabel}</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[24],
    backgroundColor: colors.dark.overlay.scrim,
  },
  card: {
    width: '100%',
    maxWidth: 342,
    alignItems: 'center',
    gap: space[16],
    padding: space[24],
    borderRadius: radius.sheet,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.elevated,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    gap: space[8],
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    fontFamily: typography.h3.fontFamily,
    fontSize: typography.h3.fontSize,
    lineHeight: typography.h3.lineHeight,
    letterSpacing: typography.h3.letterSpacing,
    color: colors.dark.text.primary,
  },
  text: {
    textAlign: 'center',
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: 18,
    color: colors.dark.text.secondary,
  },
  actions: {
    width: '100%',
    gap: space[8],
  },
  confirmButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
  },
  confirmLabel: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    lineHeight: typography.labelLarge.lineHeight,
  },
  cancelButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
  },
  cancelLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.secondary,
  },
});
