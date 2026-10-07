// Gerado a partir de Dark.tokens.json e Light.tokens.json (coleção Color do Figma).
// Cada token semântico aponta para um valor de Primitives — ver o comentário de origem no Figma.
// Não editar à mão — regerar a partir do export do Figma quando os tokens mudarem.

const darkColors = {
  bg: {
    default: '#0B0A12',
    surface: '#16151A',
    elevated: '#232329',
    brand: '#7C5CFF',
    brandHover: '#9385FF',
    brandPressed: '#6647E2',
    brandSubtle: '#25176C',
    successSubtle: '#023A29',
    errorSubtle: '#5A0010',
    alertSubtle: '#462B00',
    control: '#3A3A40',
    glass: 'rgba(255, 255, 255, 0.14)',
    sunken: '#16151A',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#BDBDC5',
    tertiary: '#9797A0',
    inverse: '#0B0A12',
    onBrand: '#FFFFFF',
    brand: '#AEA8FF',
    success: '#22C997',
    error: '#FF6E72',
    alert: '#F5A524',
  },
  border: {
    default: '#232329',
    strong: '#3A3A40',
    brand: '#7C5CFF',
  },
  icon: {
    success: '#22C997',
    error: '#F04452',
    alert: '#F5A524',
  },
  overlay: {
    scrim: 'rgba(5, 4, 10, 0.72)',
  },
} as const;

const lightColors = {
  bg: {
    default: '#F6F6FF',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    brand: '#7C5CFF',
    brandHover: '#6647E2',
    brandPressed: '#4F34BE',
    brandSubtle: '#F0EFFF',
    successSubtle: '#E8F9F1',
    errorSubtle: '#FFEDEC',
    alertSubtle: '#FEF4E7',
    control: '#EAEAF3',
    glass: 'rgba(0, 0, 0, 0.06)',
    sunken: '#F6F6FF',
  },
  text: {
    primary: '#0B0A12',
    secondary: '#55555B',
    tertiary: '#74747B',
    inverse: '#FFFFFF',
    onBrand: '#FFFFFF',
    brand: '#6647E2',
    success: '#01805E',
    error: '#AA0F2A',
    alert: '#9C6603',
  },
  border: {
    default: '#D6D6DF',
    strong: '#BDBDC5',
    brand: '#7C5CFF',
  },
  icon: {
    success: '#08A67B',
    error: '#D02A3E',
    alert: '#CB8609',
  },
  overlay: {
    scrim: 'rgba(11, 10, 18, 0.4)',
  },
} as const;

export const colors = { dark: darkColors, light: lightColors } as const;
export type ThemeMode = keyof typeof colors;
export type ColorTokens = typeof darkColors;
