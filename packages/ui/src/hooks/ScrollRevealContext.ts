// Contexto que o `RevealScrollView` de uma tela fornece pros gráficos dentro dela saberem
// "em que posição de scroll a tela está agora" — ver `useRevealProgress`.
import { createContext, useContext } from 'react';
import type { AnimatedRef, SharedValue } from 'react-native-reanimated';
import type { HostInstance } from 'react-native';

export type ScrollRevealValue = {
  scrollViewRef: AnimatedRef<HostInstance>;
  /** Muda a cada frame de scroll — existe só pra forçar o recálculo de visibilidade no worklet. */
  scrollY: SharedValue<number>;
};

export const ScrollRevealContext = createContext<ScrollRevealValue | null>(null);

export function useScrollReveal(): ScrollRevealValue | null {
  return useContext(ScrollRevealContext);
}
