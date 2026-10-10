// "Brilho" no topo das telas internas — estilo Brilho/Roxo do Figma (elipse 520×420 em -60,-120),
// usado em Contas e cartões, Conexão, Renovar acesso e Gastos · Categoria.
import { colors, GlowOrb, primitives } from '@planor/ui';
import { StyleSheet, View } from 'react-native';

/** Roxo por padrão; âmbar quando o assunto é um alerta (tela "Acesso vencendo"). */
export function ScreenGlow({ tone = 'marca' }: { tone?: 'marca' | 'alerta' }) {
  return (
    <View style={styles.glow} pointerEvents="none">
      <GlowOrb
        width={520}
        height={420}
        color={tone === 'alerta' ? colors.dark.text.alert : primitives.purple[500]}
        stops={[
          { offset: 0, opacity: 0.35 },
          { offset: 0.55, opacity: 0.1225 },
          { offset: 1, opacity: 0 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', top: -120, left: -60 },
});
