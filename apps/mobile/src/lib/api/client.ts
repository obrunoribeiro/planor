// Cliente HTTP pra API do Planor — anexa o token do Supabase em toda chamada. `EXPO_PUBLIC_API_URL`
// precisa ser o IP da rede local do Mac quando testando num celular físico via Expo Go
// ("localhost" ali seria o próprio celular, não o Mac rodando a API).
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function apiFetch<T>(
  path: string,
  { accessToken, ...init }: RequestInit & { accessToken: string },
): Promise<T> {
  if (!API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL não definida — copie .env.example para .env na raiz do repo.');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.error ?? `Erro ${response.status}`);
  }

  if (response.status === 204) return undefined as T; // ex.: DELETE /connections/:id

  return response.json() as Promise<T>;
}

/** Upload multipart (ex.: importar fatura) — sem `Content-Type` manual: o `fetch` do RN gera o
 * boundary certo sozinho a partir do `FormData`, e sobrescrever quebraria o parse no servidor. */
export async function apiUpload<T>(path: string, { accessToken, formData }: { accessToken: string; formData: FormData }): Promise<T> {
  if (!API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL não definida — copie .env.example para .env na raiz do repo.');
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    body: formData,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.error ?? `Erro ${response.status}`);
  }

  return response.json() as Promise<T>;
}
