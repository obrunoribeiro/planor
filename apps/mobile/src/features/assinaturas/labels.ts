// Textos e cores compartilhados entre a lista e o detalhe de Assinaturas (CONTEXTO.md §6.6).
import { colors, primitives } from '@planor/ui';
import type { SubscriptionItem, SubscriptionUsage } from '@/lib/api/types';

/** Cores das iniciais na ordem do Figma (31:577): roxo, âmbar, verde, roxo escuro. */
const INITIAL_COLORS = [primitives.purple[800], primitives.alert[800], primitives.success[800], primitives.purple[900]];

export function initialColor(index: number): string {
  return INITIAL_COLORS[index % INITIAL_COLORS.length]!;
}

/** Selo do detalhe — tocar nele abre "Você usa esse serviço?". */
export const USAGE_BADGE: Record<SubscriptionUsage, { label: string; bg: string; text: string }> = {
  unknown: { label: 'Você usa esse serviço?', bg: colors.dark.bg.brandSubtle, text: colors.dark.text.brand },
  high: { label: 'Você usa com frequência', bg: colors.dark.bg.successSubtle, text: colors.dark.text.success },
  low: { label: 'Você usa pouco', bg: colors.dark.bg.elevated, text: colors.dark.text.secondary },
  none: { label: 'Você marcou como sem uso', bg: colors.dark.bg.alertSubtle, text: colors.dark.text.alert },
};

export type SubscriptionSort = 'amount' | 'next' | 'unused' | 'name';

export const SORT_LABEL: Record<SubscriptionSort, string> = {
  amount: 'Maior valor',
  next: 'Próxima cobrança',
  unused: 'Sem uso primeiro',
  name: 'Nome (A–Z)',
};

export function sortSubscriptions(items: SubscriptionItem[], sort: SubscriptionSort): SubscriptionItem[] {
  const byAmount = (a: SubscriptionItem, b: SubscriptionItem) => b.amountCents - a.amountCents;
  return [...items].sort((a, b) => {
    switch (sort) {
      case 'amount':
        return byAmount(a, b);
      case 'next':
        return (a.nextChargeAt ?? '9999').localeCompare(b.nextChargeAt ?? '9999');
      case 'unused':
        return Number(b.usage === 'none') - Number(a.usage === 'none') || byAmount(a, b);
      case 'name':
        return a.merchantName.localeCompare(b.merchantName, 'pt-BR');
    }
  });
}
