// Voltar com segurança. Quando o app abre direto numa tela interna (link `planor://...`,
// notificação), não existe tela anterior na pilha e `router.back()` não faz nada (em dev, ainda
// mostra o erro "GO_BACK was not handled"). Nesse caso, vai pra tela "mãe" daquela rota.
import { router, type Href } from 'expo-router';

export function goBack(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
