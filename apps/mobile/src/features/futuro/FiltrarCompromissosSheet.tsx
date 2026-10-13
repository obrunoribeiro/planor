// Filtrar compromissos — Figma 49:1095 (CONTEXTO.md §6.6). "Mostrar" (parcelas, assinaturas,
// fixos) e "Até" (3, 6 ou 12 meses). "Cartões e contas" fica de fora por enquanto: assinaturas e
// fixos ainda não guardam em qual cartão/conta caem — ver PROGRESSO.md.
import { Button, Chip, colors, Sheet, space, typography } from '@planor/ui';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CommitmentKind } from '@/lib/api/queries';

const KIND_LABEL: Record<CommitmentKind, string> = {
  installments: 'Parcelas',
  subscriptions: 'Assinaturas',
  bills: 'Fixos',
};
const HORIZONS = [3, 6, 12] as const;

export type FiltrarCompromissosSheetProps = {
  visible: boolean;
  onClose: () => void;
  kinds: CommitmentKind[];
  months: number;
  onApply: (filter: { kinds: CommitmentKind[]; months: number }) => void;
};

export function FiltrarCompromissosSheet({
  visible,
  onClose,
  kinds,
  months,
  onApply,
}: FiltrarCompromissosSheetProps) {
  const [draftKinds, setDraftKinds] = useState<CommitmentKind[]>(kinds);
  const [draftMonths, setDraftMonths] = useState(months);

  useEffect(() => {
    if (!visible) return;
    setDraftKinds(kinds);
    setDraftMonths(months);
  }, [visible, kinds, months]);

  const toggle = (kind: CommitmentKind) =>
    setDraftKinds((current) =>
      current.includes(kind) ? current.filter((k) => k !== kind) : [...current, kind],
    );

  return (
    <Sheet visible={visible} title="Filtrar compromissos" onClose={onClose}>
      <View style={styles.group}>
        <Text style={styles.label}>Mostrar</Text>
        <View style={styles.chips}>
          {(Object.keys(KIND_LABEL) as CommitmentKind[]).map((kind) => (
            <Chip
              key={kind}
              label={KIND_LABEL[kind]}
              active={draftKinds.includes(kind)}
              onPress={() => toggle(kind)}
            />
          ))}
        </View>
      </View>
      <View style={styles.group}>
        <Text style={styles.label}>Até</Text>
        <View style={styles.chips}>
          {HORIZONS.map((h) => (
            <Chip
              key={h}
              label={`${h} meses`}
              active={draftMonths === h}
              onPress={() => setDraftMonths(h)}
            />
          ))}
        </View>
      </View>
      <Button
        label="Aplicar"
        disabled={draftKinds.length === 0}
        onPress={() => {
          onApply({ kinds: draftKinds, months: draftMonths });
          onClose();
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[10] },
  label: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.dark.text.secondary,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
});
