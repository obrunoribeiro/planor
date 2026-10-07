// Dados fictícios — CONTEXTO.md §6.7. Fase 1 ainda não liga o modelo de verdade.
import type { IconName } from '@planor/ui';

export const iaMock = {
  connectedBanksLabel: 'Lendo seus dados de 3 bancos',
  greeting: 'Oi, Bruno. O que você quer saber sobre seu dinheiro?',
  subtitle: 'Eu leio suas contas e cartões e respondo com seus números, não com dicas genéricas.',
  suggestions: [
    { id: 'delivery', icon: 'comida' as IconName, text: 'Quanto gastei com delivery em outubro?' },
    { id: 'parcelar', icon: 'sacola' as IconName, text: 'Posso parcelar um celular de R$ 3.000,00?' },
    { id: 'assinaturas', icon: 'play' as IconName, text: 'Quais assinaturas eu posso cortar?' },
    { id: 'guardar', icon: 'meta' as IconName, text: 'Como guardar R$ 500,00 por mês?' },
  ],
} as const;
