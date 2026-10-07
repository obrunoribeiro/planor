// Dados fictícios do Bruno — CONTEXTO.md §12, §6.10.
export const perfilMock = {
  user: { name: 'Bruno', email: 'bruno@email.com', initials: 'B' },
  plan: { label: 'Plano Grátis', detail: '3 bancos · 10 perguntas por mês' },
  account: {
    connectedBanksCount: 2,
    planLabel: 'Grátis',
  },
  security: { biometricLabel: 'Biometria ativa' },
  household: { description: 'Casa com Ana' },
  friends: { count: 4 },
  referral: { reward: '1 mês grátis' },
  version: 'Planor 1.0.0',
} as const;
