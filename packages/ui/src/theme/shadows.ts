// Estilos de efeito do Figma (`Sombra/*`, `Brilho/*`), convertidos pras props de sombra do
// React Native (iOS: shadow*; Android: elevation, que não tem cor própria — é só uma
// aproximação visual).
//
// ⚠️ CONFIRMADOS AO VIVO: marca (Sombra/Marca), marcaForte (órbita da Planor IA, node 33:575).
// ⚠️ AINDA NÃO EXTRAÍDOS: sucesso, ambar (Sombra/*), brilhoBordaInterna (Brilho/Borda interna)
// e o desfoque de vidro (Desfoque/Vidro, usa `expo-blur`). Mesmo caminho do gradients.ts: rodar
// get_design_context no componente que usa cada estilo.

export type ShadowToken = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export const shadows = {
  // Sombra/Marca: DROP_SHADOW #7C5CFF a 35% (0x59), offset (0, 12), raio 32.
  marca: {
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 12,
  },
  // Sombra/Marca forte: #7C5CFF a 45%, offset (0, 20), raio 50.
  marcaForte: {
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.45,
    shadowRadius: 50,
    elevation: 20,
  },
} as const satisfies Record<string, ShadowToken>;

export type ShadowName = keyof typeof shadows;
