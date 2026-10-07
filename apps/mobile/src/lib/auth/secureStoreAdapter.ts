// O expo-secure-store tem limite de ~2048 bytes por item (Keychain/Keystore) — a sessão do
// Supabase (access token + refresh token + dados do usuário) costuma passar disso. Esse
// adaptador fatia o valor em pedaços menores antes de salvar, e remonta na leitura. Padrão
// documentado pela própria Supabase pro Expo ("LargeSecureStore").
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 2000;

function chunkKey(key: string, index: number) {
  return `${key}_${index}`;
}

export const secureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const countRaw = await SecureStore.getItemAsync(`${key}_chunks`);
    if (!countRaw) return null;

    const count = Number(countRaw);
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      if (part === null) return null; // pedaço faltando — sessão corrompida, trata como ausente
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    await secureStoreAdapter.removeItem(key); // limpa pedaços antigos (pode ter menos chunks agora)

    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(chunkKey(key, i), chunk)));
    await SecureStore.setItemAsync(`${key}_chunks`, String(chunks.length));
  },

  async removeItem(key: string): Promise<void> {
    const countRaw = await SecureStore.getItemAsync(`${key}_chunks`);
    if (!countRaw) return;

    const count = Number(countRaw);
    await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(chunkKey(key, i))));
    await SecureStore.deleteItemAsync(`${key}_chunks`);
  },
};
