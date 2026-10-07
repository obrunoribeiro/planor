// Estilos de gradiente do Figma (`Gradiente/*`) e gradientes ad-hoc capturados em telas reais,
// pra usar com `expo-linear-gradient`.
//
// `start`/`end` convertidos do ângulo CSS do Figma (0°=pra cima, 90°=direita, 180°=pra baixo,
// sentido horário) pras coordenadas 0–1 que o expo-linear-gradient espera, com
//   dx = sin(θ), dy = -cos(θ)
//   start = (0.5 − dx/2, 0.5 − dy/2)   end = (0.5 + dx/2, 0.5 + dy/2)
//
// ⚠️ CONFIRMADOS AO VIVO (via get_design_context, CSS real extraído do Figma):
//   botao, marcaProfundo, icone, progresso — estilos nomeados `Gradiente/*` do Figma.
//   headerSobra, retrospectiva, jaComprometido, bannerPro, totalGastos, chipAtivo, planoCard —
//   preenchimentos ad-hoc (não são um estilo `Gradiente/*` nomeado; cada um foi capturado direto
//   no node que usa).
// ⚠️ AINDA NÃO EXTRAÍDOS: cardDestaque, sucesso, amber, teal, rosa, azul, progressoAmbar,
// progressoTeal (estilos `Gradiente/*` nomeados que nenhuma tela que já abrimos usa ainda) — pra
// completar, rode get_design_context num componente que use cada um.

export type GradientToken = {
  colors: readonly [string, string, ...string[]];
  /** Só quando os stops não são uniformemente espaçados (ex.: um "via-X%" do Figma). */
  locations?: readonly number[];
  angle: number;
  start: { x: number; y: number };
  end: { x: number; y: number };
};

export const gradients = {
  // Botão primário. #7457F5 → #4F34BE, 135°.
  botao: {
    colors: ['#7457F5', '#4F34BE'],
    angle: 135,
    start: { x: 0.146, y: 0.146 },
    end: { x: 0.854, y: 0.854 },
  },
  // "Marca profundo" — ícones e selos de destaque. #9385FF → #6647E2 → #25176C.
  marcaProfundo: {
    colors: ['#9385FF', '#6647E2', '#25176C'],
    angle: 135,
    start: { x: 0.146, y: 0.146 },
    end: { x: 0.854, y: 0.854 },
  },
  // Caixa de ícone com estilo "Gradiente" e Avatar. #9385FF → #4F34BE, 135°.
  icone: {
    colors: ['#9385FF', '#4F34BE'],
    angle: 135,
    start: { x: 0.146, y: 0.146 },
    end: { x: 0.854, y: 0.854 },
  },
  // Barra/anel de progresso e coluna em destaque. #C8C6FE → #7C5CFF, horizontal.
  progresso: {
    colors: ['#C8C6FE', '#7C5CFF'],
    angle: 90,
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  },
  // Topo da Home ("Sobra prevista") — vertical, de cima pra baixo, stop do meio em 70%.
  headerSobra: {
    colors: ['#120E2E', '#23177A', '#2E1E9E'],
    locations: [0, 0.7, 1],
    angle: 180,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  // Card "Sua retrospectiva chegou" na Home.
  retrospectiva: {
    colors: ['#5A1B48', '#4F34BE', '#25176C'],
    locations: [0, 0.5, 1],
    angle: 160.78,
    start: { x: 0.335, y: 0.028 },
    end: { x: 0.665, y: 0.972 },
  },
  // Card "Já comprometido" na Home (fundo sutil, quase sólido).
  jaComprometido: {
    colors: ['#1E1A3A', '#16151A'],
    locations: [0, 0.6],
    angle: 138.1,
    start: { x: 0.166, y: 0.128 },
    end: { x: 0.834, y: 0.872 },
  },
  // Banner "Planor Pro" na Home.
  bannerPro: {
    colors: ['#7C5CFF', '#4F34BE', '#1A1150'],
    locations: [0, 0.45, 1],
    angle: 147.15,
    start: { x: 0.229, y: 0.08 },
    end: { x: 0.771, y: 0.92 },
  },
  // Chip ativo (Padrão/Ativo). #9385FF → #6647E2, 147°.
  chipAtivo: {
    colors: ['#9385FF', '#6647E2'],
    angle: 146.75,
    start: { x: 0.226, y: 0.082 },
    end: { x: 0.774, y: 0.918 },
  },
  // Card do plano em Perfil. #7C5CFF → #4F34BE (60%) → #25176C.
  planoCard: {
    colors: ['#7C5CFF', '#4F34BE', '#25176C'],
    locations: [0, 0.6, 1],
    angle: 169.4,
    start: { x: 0.408, y: 0.009 },
    end: { x: 0.592, y: 0.991 },
  },
  // Card "Total gasto" em Gastos · Resumo.
  totalGastos: {
    colors: ['#2B1A86', '#1A1440', '#16151A'],
    locations: [0, 0.55, 1],
    angle: 143.62,
    start: { x: 0.203, y: 0.097 },
    end: { x: 0.797, y: 0.903 },
  },
} as const satisfies Record<string, GradientToken>;

export type GradientName = keyof typeof gradients;
