// ScrollView que avisa os gráficos dentro dela quando a posição de scroll muda, pra cada um
// poder animar só quando entra de verdade na área visível — ver `useRevealProgress`.
import Animated, { useAnimatedRef, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import type { ComponentProps } from 'react';
import { ScrollRevealContext } from '../hooks/ScrollRevealContext';

export type RevealScrollViewProps = ComponentProps<typeof Animated.ScrollView>;

export function RevealScrollView({ children, ...props }: RevealScrollViewProps) {
  const scrollViewRef = useAnimatedRef();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  return (
    <ScrollRevealContext.Provider value={{ scrollViewRef, scrollY }}>
      <Animated.ScrollView scrollEventThrottle={16} {...props} ref={scrollViewRef} onScroll={scrollHandler}>
        {children}
      </Animated.ScrollView>
    </ScrollRevealContext.Provider>
  );
}
