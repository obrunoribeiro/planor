// Logo/Símbolo — CONTEXTO.md §4. Node 15:43 no Figma: "traço convertido em forma", bicolor
// fixo (não é um Ícone/* genérico recolorável via prop única). Só a variante "Branco + lilás"
// foi extraída até agora (a única usada nas telas que já construímos); as demais variantes do
// Figma (Roxo, Branco, Preto, gradiente) ficam pendentes — não foram inventadas aqui.
import { Path, Svg } from 'react-native-svg';

export type LogoProps = {
  size?: number;
  primaryColor?: string;
  accentColor?: string;
};

const LACO_PATH =
  'M6 93.9997V41.9997C6 34.4841 8.22888 27.1374 12.4043 20.8884C16.5798 14.6394 22.5144 9.76846 29.458 6.89233C36.4015 4.01623 44.0419 3.26405 51.4131 4.73022C58.7844 6.19645 65.5557 9.81524 70.8701 15.1296C76.1845 20.444 79.8033 27.2154 81.2695 34.5867C82.7357 41.9579 81.9835 49.5982 79.1074 56.5417C76.2313 63.4853 71.3604 69.42 65.1113 73.5955C58.8623 77.7709 51.5156 79.9997 44 79.9997C39.5817 79.9997 36 76.418 36 71.9997C36 67.5815 39.5817 63.9997 44 63.9997C48.3512 63.9997 52.6048 62.7091 56.2227 60.2917C59.8404 57.8744 62.6601 54.4386 64.3252 50.4187C65.9903 46.3987 66.426 41.9753 65.5771 37.7078C64.7283 33.4402 62.6334 29.5199 59.5566 26.4431C56.4799 23.3664 52.5596 21.2715 48.292 20.4226C44.0244 19.5737 39.601 20.0094 35.5811 21.6746C31.5612 23.3396 28.1254 26.1593 25.708 29.7771C23.2906 33.395 22 37.6486 22 41.9997V93.9997C22 98.418 18.4183 102 14 102C9.58172 102 6 98.418 6 93.9997Z';
const PONTO_PATH =
  'M44 51C48.9706 51 53 46.9706 53 42C53 37.0294 48.9706 33 44 33C39.0294 33 35 37.0294 35 42C35 46.9706 39.0294 51 44 51Z';

export function Logo({ size = 48, primaryColor = '#FFFFFF', accentColor = '#C8C6FE' }: LogoProps) {
  const width = size * (88 / 104);

  return (
    <Svg width={width} height={size} viewBox="0 0 88 104" fill="none">
      <Path d={LACO_PATH} fill={primaryColor} />
      <Path d={PONTO_PATH} fill={accentColor} />
    </Svg>
  );
}
