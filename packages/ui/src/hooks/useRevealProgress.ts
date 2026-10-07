// Anima gráficos e barras de progresso do estado 0 até o valor atual quando (e só quando) a
// barrinha/gráfico realmente aparece na área visível da tela — não a tela toda de uma vez. E só
// uma vez por visita: sair da tela e voltar rearma a animação; subir e descer o scroll na mesma
// visita não.
import { useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import {
  Easing,
  measure,
  useAnimatedReaction,
  useAnimatedRef,
  useSharedValue,
  withTiming,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated';
import type { HostInstance } from 'react-native';
import { useScrollReveal } from './ScrollRevealContext';

export type RevealProgress = {
  progress: SharedValue<number>;
  /** Anexar em `ref` do elemento que deve ser medido (precisa ser um `Animated.View`/componente SVG animável). */
  ref: AnimatedRef<HostInstance>;
};

/** `target` em qualquer escala (0–100 pra percentuais, ou outra unidade — quem usa decide). */
export function useRevealProgress(target: number, duration = 900): RevealProgress {
  const progress = useSharedValue(0);
  const played = useSharedValue(false);
  const isFocused = useIsFocused();
  const ref = useAnimatedRef<HostInstance>();
  const reveal = useScrollReveal();

  // Toda vez que a tela volta a ficar em foco é uma "visita nova": rearma, pra poder animar de
  // novo quando o que já tinha sido visto reaparecer na tela.
  useEffect(() => {
    if (isFocused) {
      played.value = false;
      progress.value = 0;
    }
  }, [isFocused, played, progress]);

  useAnimatedReaction(
    () => {
      'worklet';
      if (!isFocused || played.value) return false;

      // Sem RevealScrollView por perto (tela sem scroll, ou ainda não migrada) — cai pro
      // comportamento antigo: anima assim que a tela foca, sem depender de posição de scroll.
      if (!reveal) return true;

      // Só existe pra forçar esse worklet a rodar de novo a cada frame de scroll.
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      reveal.scrollY.value;

      const card = measure(ref);
      const scroller = measure(reveal.scrollViewRef);
      if (!card || !scroller) return false;

      const cardTop = card.pageY;
      const cardBottom = cardTop + card.height;
      const viewTop = scroller.pageY;
      const viewBottom = scroller.pageY + scroller.height;

      return cardBottom > viewTop && cardTop < viewBottom;
    },
    (visible) => {
      'worklet';
      if (visible) {
        played.value = true;
        progress.value = withTiming(target, { duration, easing: Easing.out(Easing.cubic) });
      }
    },
    [isFocused, target],
  );

  return { progress, ref };
}
