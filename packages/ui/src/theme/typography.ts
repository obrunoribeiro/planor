// Escala tipográfica Manrope (ver CONTEXTO.md §4).
// `fontFamily` segue a convenção de arquivo do pacote @expo-google-fonts/manrope.
//
// Confirmado ao vivo via get_design_context/get_variable_defs no Figma: h2, h3, bodyLarge,
// bodyMedium, bodySmall, labelLarge, labelMedium, labelSmall, caption, numberXl, numberLarge,
// numberMedium, numberSmall.
// NÃO confirmado ao vivo (só a referência do CONTEXTO.md, sem letterSpacing documentado ali):
// display, h1 — o letterSpacing abaixo é estimado por extrapolação da escala. Confirme no
// Figma (Style Guide → Tipografia → Type scale, frames 4:4 e 4:8) antes de travar o valor.

export type TextStyleToken = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
};

const weight = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
} as const;

export const typography = {
  // ⚠️ estimado — ver nota acima
  display: { fontFamily: weight.extraBold, fontSize: 32, lineHeight: 40, letterSpacing: -1.5 },
  // ⚠️ estimado — ver nota acima
  h1: { fontFamily: weight.extraBold, fontSize: 28, lineHeight: 36, letterSpacing: -1.25 },

  h2: { fontFamily: weight.bold, fontSize: 22, lineHeight: 28, letterSpacing: -1 },
  h3: { fontFamily: weight.semiBold, fontSize: 18, lineHeight: 24, letterSpacing: -0.5 },

  bodyLarge: { fontFamily: weight.regular, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  bodyMedium: { fontFamily: weight.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  bodySmall: { fontFamily: weight.regular, fontSize: 13, lineHeight: 18, letterSpacing: 0 },

  labelLarge: { fontFamily: weight.semiBold, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  labelMedium: { fontFamily: weight.semiBold, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  labelSmall: { fontFamily: weight.semiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.5 },

  caption: { fontFamily: weight.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.5 },

  numberXl: { fontFamily: weight.extraBold, fontSize: 36, lineHeight: 44, letterSpacing: -2 },
  numberLarge: { fontFamily: weight.bold, fontSize: 24, lineHeight: 32, letterSpacing: -1 },
  numberMedium: { fontFamily: weight.semiBold, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  numberSmall: { fontFamily: weight.semiBold, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
} as const satisfies Record<string, TextStyleToken>;

export type TypographyToken = keyof typeof typography;
