// Telas com campo de texto precisam de duas coisas que o React Native não dá de graça: 1) o
// botão principal subir pra cima do teclado em vez de ficar escondido atrás dele, e 2) tocar
// fora de um campo fechar o teclado. Esse wrapper resolve as duas.
import type { ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, View } from 'react-native';

export function KeyboardDismissView({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>{children}</View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
