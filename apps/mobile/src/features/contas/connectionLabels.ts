// Textos de status de uma conexão bancária — usados na lista "Contas e cartões" e no Detalhe da
// conexão (CONTEXTO.md §6.10), pra os dois lugares dizerem a mesma coisa.
import type { ConnectionAccount, ConnectionListItem } from '@/lib/api/types';
import { dayMonthLabel, monthYearShortLabel, saoPauloDateKey, timeAgoLabel } from '@/lib/format';

/** "Nubank" → "NU", "Banco Inter" → "IN", "Itaú" → "IT" (avatar do banco no Figma). */
export function bankInitials(institutionName: string): string {
  const words = institutionName.split(/\s+/).filter((word) => word.toLowerCase() !== 'banco');
  return (words[0] ?? institutionName).slice(0, 2).toUpperCase();
}

/** Linha de status embaixo do nome do banco, na lista. */
export function connectionStatusLabel(connection: ConnectionListItem): string {
  switch (connection.status) {
    case 'connected':
      return connection.consentExpiresAt
        ? `Conectado · renova em ${monthYearShortLabel(saoPauloDateKey(connection.consentExpiresAt))}`
        : 'Conectado';
    case 'consent_expired':
      return connection.consentExpiresAt ? `Acesso expirou em ${dayMonthLabel(connection.consentExpiresAt)}` : 'Acesso expirou';
    case 'error':
      return 'Não conseguimos atualizar';
    case 'disconnected':
      return 'Desconectado · o histórico continua aqui';
  }
}

const ACCOUNT_LABEL: Record<ConnectionAccount['type'], { title: string; detail: string }> = {
  checking: { title: 'Conta corrente', detail: 'Saldo' },
  savings: { title: 'Poupança', detail: 'Saldo' },
  credit_card: { title: 'Cartão de crédito', detail: 'Fatura atual' },
};

export function accountLabel(account: ConnectionAccount) {
  return ACCOUNT_LABEL[account.type];
}

/** "atualizado há 5 minutos" — `null` se a conexão nunca sincronizou. */
export function lastSyncLabel(lastSyncAt: string | null, opts?: { short?: boolean }): string | null {
  return lastSyncAt ? `atualizado ${timeAgoLabel(lastSyncAt, opts)}` : null;
}
