// Gerado a partir de Value.tokens.json (coleção Primitives do Figma).
// Não editar à mão — regerar a partir do export do Figma quando a paleta mudar.

export const primitives = {
  purple: {
    0: '#FAFAFE',
    50: '#F0EFFF',
    100: '#E0E0FF',
    200: '#C8C6FE',
    300: '#AEA8FF',
    400: '#9385FF',
    500: '#7C5CFF',
    600: '#6647E2',
    700: '#4F34BE',
    800: '#392594',
    900: '#25176C',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F6F6FF',
    100: '#EAEAF3',
    200: '#D6D6DF',
    300: '#BDBDC5',
    400: '#9797A0',
    500: '#74747B',
    600: '#55555B',
    700: '#3A3A40',
    800: '#232329',
    900: '#16151A',
    1000: '#0B0A12',
  },
  success: {
    50: '#E8F9F1',
    100: '#D4F5E6',
    200: '#B2EDD3',
    300: '#88E4BF',
    400: '#5AD7AA',
    500: '#22C997',
    600: '#08A67B',
    700: '#01805E',
    800: '#055C43',
    900: '#023A29',
  },
  error: {
    50: '#FFEDEC',
    100: '#FEDCDB',
    200: '#FEBFBD',
    300: '#FF9B9A',
    400: '#FF6E72',
    500: '#F04452',
    600: '#D02A3E',
    700: '#AA0F2A',
    800: '#82011C',
    900: '#5A0010',
  },
  alert: {
    50: '#FEF4E7',
    100: '#FFEAD2',
    200: '#FFDBB0',
    300: '#FFCA87',
    400: '#FDB655',
    500: '#F5A524',
    600: '#CB8609',
    700: '#9C6603',
    800: '#6F4804',
    900: '#462B00',
  },
  accent: {
    pink: { 300: '#FF8FB1', 700: '#B83B6B' },
    green: { 300: '#5AD7AA', 700: '#0E8F68' },
    amber: { 300: '#FFC46B', 700: '#C27A12' },
    blue: { 300: '#7CC4FF', 700: '#2A6FBF' },
    teal: { 300: '#6EE7D8', 700: '#0F8F86' },
  },
  // Stops crus usados pelos gradientes de marca (não fazem parte da escala numerada)
  brandGradient: {
    start: '#9385FF', // = purple.400
    mid: '#6647E2', // = purple.600
    buttonStart: '#7457F5', // distinto de purple.500, só no gradiente do botão
  },
} as const;

export type Primitives = typeof primitives;
