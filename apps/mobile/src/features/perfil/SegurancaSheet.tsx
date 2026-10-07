// "Segurança" — CONTEXTO.md §6.10. Por ora só "Ocultar valores ao abrir" é real (persiste via
// PATCH /settings); biometria, bloqueio automático, trocar e-mail e aparelhos conectados ainda
// não têm implementação — ver PROGRESSO.md.
import { colors, Sheet, space, Toggle, typography } from '@planor/ui';
import { StyleSheet, Text, View } from 'react-native';
import { useSettingsQuery, useUpdateSettingsMutation } from '@/lib/api/queries';

export type SegurancaSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function SegurancaSheet({ visible, onClose }: SegurancaSheetProps) {
  const { data: settings, isPending } = useSettingsQuery();
  const { mutate, isPending: isSaving } = useUpdateSettingsMutation();

  return (
    <Sheet visible={visible} title="Segurança" onClose={onClose}>
      <View style={styles.row}>
        <View style={styles.texts}>
          <Text style={styles.title}>Ocultar valores ao abrir</Text>
          <Text style={styles.subtitle}>O app abre com os valores ocultos até você tocar no olho.</Text>
        </View>
        <Toggle
          value={settings?.hideValuesOnOpen ?? false}
          onValueChange={(value) => mutate({ hideValuesOnOpen: value })}
          accessibilityLabel="Ocultar valores ao abrir"
          disabled={isPending || isSaving}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[16],
  },
  texts: {
    flex: 1,
    gap: space[4],
  },
  title: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    color: colors.dark.text.primary,
  },
  subtitle: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
});
