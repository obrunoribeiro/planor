// Peças comuns das telas de conexão bancária (Contas e cartões, Conexão, Acesso vencendo,
// Renovar acesso) — CONTEXTO.md §6.2 e §6.10. Medidas e cores das telas 34:785, 53:1306,
// 83:2288 e 83:2329 do Figma.
import { colors, primitives, radius, space, typography } from '@planor/ui';
import { StyleSheet, Text, View } from 'react-native';
import { institutionInitials } from '@/lib/format';
import type { ConnectionListItem } from '@/lib/api/types';

/** Estado de exibição de uma conexão. A ordem de prioridade importa: venceu > com erro > vencendo. */
export type ConnectionUiState = 'expired' | 'error' | 'expiring' | 'ok';

/** Marco de "vencendo" (§6.2: avisar com 7 dias de antecedência). */
const EXPIRING_WINDOW_DAYS = 7;

export function connectionUiState(connection: ConnectionListItem): ConnectionUiState {
  if (connection.status === 'consent_expired' || (connection.consentDaysLeft !== null && connection.consentDaysLeft < 0)) {
    return 'expired';
  }
  if (connection.status === 'error') return 'error';
  if (connection.consentDaysLeft !== null && connection.consentDaysLeft <= EXPIRING_WINDOW_DAYS) return 'expiring';
  return 'ok';
}

/** "Vence hoje" / "Vence amanhã" / "Vence em 7 dias". */
export function expiresInLabel(daysLeft: number): string {
  if (daysLeft <= 0) return 'Vence hoje';
  if (daysLeft === 1) return 'Vence amanhã';
  return `Vence em ${daysLeft} dias`;
}

export function BankAvatar({ name, size = 44 }: { name: string; size?: 44 | 64 | 72 }) {
  const large = size > 44;
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={large ? styles.avatarTextLarge : styles.avatarText}>{institutionInitials(name)}</Text>
    </View>
  );
}

/** Lista de pares rótulo/valor com divisor (cards "Consentimento" e "Datas" do Figma). */
export function InfoRows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <View style={styles.infoCard}>
      {rows.map((row, i) => (
        <View key={row.label} style={[styles.infoRow, i < rows.length - 1 && styles.infoRowDivider]}>
          <Text style={styles.infoLabel}>{row.label}</Text>
          <Text style={styles.infoValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: primitives.neutral[800],
    borderWidth: 1,
    borderColor: colors.dark.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.dark.text.secondary,
  },
  avatarTextLarge: {
    fontFamily: typography.h3.fontFamily,
    fontSize: typography.h3.fontSize,
    lineHeight: typography.h3.lineHeight,
    color: colors.dark.text.primary,
  },
  infoCard: {
    backgroundColor: colors.dark.bg.surface,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    borderRadius: radius['3xl'],
    paddingHorizontal: space[16],
    paddingVertical: space[4],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[12],
    paddingVertical: space[14],
  },
  infoRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border.default,
  },
  infoLabel: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.dark.text.primary,
  },
});
