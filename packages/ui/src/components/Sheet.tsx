// Sheet/Base + Sheet/Cabeçalho — CONTEXTO.md §4: "Bottom sheets para escolhas rápidas (período,
// filtros, categoria, limite)." Node 112:181 no Figma.
import type { ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../icons';
import { colors } from '../theme/colors';
import { radius, space } from '../theme/tokens';
import { typography } from '../theme/typography';

export type SheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

export function Sheet({ visible, title, subtitle, onClose, children }: SheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Toda sheet pode ter campo de texto (ex.: Editar perfil) — isso aqui garante, pra
          qualquer sheet atual ou futura, que o teclado empurra o conteúdo pra cima em vez de
          cobrir o botão, e que tocar dentro da sheet (fora de um campo) fecha o teclado sem
          fechar a sheet inteira (só tocar no scrim por fora fecha ela). */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.scrim} onPress={onClose}>
          <Pressable
            style={styles.sheet}
            onPress={(e) => {
              e.stopPropagation();
              Keyboard.dismiss();
            }}
          >
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>
            <View style={styles.titleRow}>
              <View style={styles.texts}>
                <Text style={styles.title}>{title}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>
              <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Fechar">
                <Icon name="fechar" size={18} color={colors.dark.text.primary} />
              </Pressable>
            </View>
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.dark.overlay.scrim,
  },
  sheet: {
    gap: space[20],
    paddingHorizontal: space[24],
    paddingTop: 12,
    paddingBottom: space[40],
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.elevated,
  },
  handleRow: {
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.dark.border.strong,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
  },
  texts: {
    flex: 1,
    gap: space[4],
  },
  title: {
    fontFamily: typography.h2.fontFamily,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.22,
    color: colors.dark.text.primary,
  },
  subtitle: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: 18,
    color: colors.dark.text.secondary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: radius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.control,
  },
});
