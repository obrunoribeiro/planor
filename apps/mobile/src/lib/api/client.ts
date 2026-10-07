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

  return response.json() as Promise<T>;
}
