// "Não conseguimos atualizar o [banco]" — CONTEXTO.md §6.2 ("em caso de falha, mostrar o sheet
// ... com a hora da última atualização"). Node 83:2270 no Figma. Não usa o `Sheet` do
// packages/ui porque esse layout não tem a linha de título com "fechar": é ícone + texto
// centralizado + ação principal + "Agora não".
import { Button, colors, Icon, radius, space, typography } from '@planor/ui';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { dayTimeLabel } from '@/lib/format';

export type SyncFailedSheetProps = {
  visible: boolean;
  institutionName: string;
  lastSyncAt: string | null;
  retrying: boolean;
  onRetry: () => void;
  onClose: () => void;
};

export function SyncFailedSheet({ visible, institutionName, lastSyncAt, retrying, onRetry, onClose }: SyncFailedSheetProps) {
  // O Figma diz "a cada hora"; o job real (`sync-all-connections`) roda a cada 6h, com novas
  // tentativas em intervalo crescente quando falha — o texto conta o que o app faz de verdade.
  const text = `O banco não respondeu agora. Tentamos de novo sozinhos a cada 6 horas.${
    lastSyncAt ? ` Última atualização: ${dayTimeLabel(lastSyncAt)}.` : ''
  }`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.iconCircle}>
            <Icon name="aviso" size={26} color={colors.dark.text.alert} />
          </View>
          <View style={styles.texts}>
            <Text style={styles.title}>Não conseguimos atualizar o {institutionName}</Text>
            <Text style={styles.text}>{text}</Text>
          </View>
          <View style={styles.fullWidth}>
            <Button label="Tentar agora" onPress={onRetry} loading={retrying} />
          </View>
          <Pressable onPress={onClose} style={styles.secondary} accessibilityRole="button">
            <Text style={styles.secondaryLabel}>Agora não</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.dark.overlay.scrim },
  sheet: {
    backgroundColor: colors.dark.bg.elevated,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: space[12],
    paddingHorizontal: space[24],
    paddingBottom: space[40],
    alignItems: 'center',
    gap: space[16],
  },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.dark.border.strong },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius['4xl'],
    backgroundColor: colors.dark.bg.alertSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { gap: space[8], alignSelf: 'stretch' },
  title: {
    textAlign: 'center',
    fontFamily: typography.h3.fontFamily,
    fontSize: typography.h3.fontSize,
    lineHeight: typography.h3.lineHeight,
    color: colors.dark.text.primary,
  },
  text: {
    textAlign: 'center',
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
  fullWidth: { alignSelf: 'stretch' },
  secondary: { paddingTop: space[4], paddingHorizontal: space[16], minHeight: 44, justifyContent: 'center' },
  secondaryLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.secondary,
  },
});
