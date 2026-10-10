// Cliente da API do Pluggy — CONTEXTO.md §6.2, plano "Meu Pluggy" (gratuito, ver §15).
//
// Validado em 2026-10-07 contra uma conexão real (Nubank, via Meu Pluggy): auth, connect token,
// webhook, `/accounts` (campo `results`, confirmado) e `/items` funcionam como documentado.
// Única correção precisa: `GET /transactions` (página/pageSize) está descontinuado — devolve
// 410 — e foi trocado por `GET /v2/transactions` com cursor (ver `listTransactions`).
//
// Ainda não confirmado com dado real: o sinal do valor em contas tipo BANK (só está confirmado
// pra CREDIT nos docs — positivo = gasto no cartão). Por isso a importação usa o campo explícito
// `DEBIT`/`CREDIT` do Pluggy em vez do sinal numérico, que é seguro nos dois casos.
import { env } from '../env';

const BASE_URL = 'https://api.pluggy.ai';

let cachedApiKey: { value: string; expiresAt: number } | undefined;

/** A API key do Pluggy expira em 2h (CONTEXTO.md não cobre isso — vem da doc deles). Cacheia e
 * renova com folga de 5 min antes de expirar. */
async function getApiKey(): Promise<string> {
  if (cachedApiKey && cachedApiKey.expiresAt > Date.now()) return cachedApiKey.value;

  if (!env.PLUGGY_CLIENT_ID || !env.PLUGGY_CLIENT_SECRET) {
    throw new Error('PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET não definidas — ver .env.example.');
  }

  const response = await fetch(`${BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: env.PLUGGY_CLIENT_ID, clientSecret: env.PLUGGY_CLIENT_SECRET }),
  });
  if (!response.ok) throw new Error(`Falha ao autenticar no Pluggy (${response.status}): ${await response.text()}`);

  const { apiKey } = (await response.json()) as { apiKey: string };
  cachedApiKey = { value: apiKey, expiresAt: Date.now() + 115 * 60 * 1000 };
  return apiKey;
}

async function pluggyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = await getApiKey();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...init?.headers, 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`Pluggy ${path} falhou (${response.status}): ${await response.text()}`);
  return response.json() as Promise<T>;
}

export type PluggyItem = {
  id: string;
  connector: { id: number; name: string; imageUrl?: string };
  status: string;
  executionStatus: string;
  createdAt: string;
  consentExpiresAt?: string;
  error?: { code: string; message: string } | null;
  /** O `clientUserId` que a gente passou ao criar o connect token — é o que garante, do lado do
   * Pluggy, de quem é esse item (ver `pluggySync.ts`, que recusa sincronizar se não bater com
   * quem está pedindo). */
  clientUserId?: string | null;
};

/** `itemId` presente = modo "atualizar conexão existente" do widget (ex.: renovar consentimento
 * vencido), em vez de conectar um banco novo. */
export async function createConnectToken(opts: { itemId?: string; clientUserId: string }): Promise<string> {
  const { accessToken } = await pluggyFetch<{ accessToken: string }>('/connect_token', {
    method: 'POST',
    body: JSON.stringify({ itemId: opts.itemId, options: { clientUserId: opts.clientUserId } }),
  });
  return accessToken;
}

export async function getItem(itemId: string): Promise<PluggyItem> {
  return pluggyFetch<PluggyItem>(`/items/${itemId}`);
}

export async function deleteItem(itemId: string): Promise<void> {
  await pluggyFetch(`/items/${itemId}`, { method: 'DELETE' });
}

export type PluggyAccount = {
  id: string;
  itemId: string;
  type: 'BANK' | 'CREDIT';
  subtype: 'CHECKING_ACCOUNT' | 'SAVINGS_ACCOUNT' | 'CREDIT_CARD';
  name: string;
  balance: number;
  currencyCode: string;
  creditData?: { creditLimit?: number; balanceCloseDate?: string; balanceDueDate?: string } | null;
};

export async function listAccounts(itemId: string): Promise<PluggyAccount[]> {
  const { results } = await pluggyFetch<{ results: PluggyAccount[] }>(`/accounts?itemId=${itemId}`);
  return results;
}

export type PluggyTransaction = {
  id: string;
  accountId: string;
  date: string;
  description: string;
  descriptionRaw?: string | null;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
};

/** `GET /transactions` (página/pageSize) foi descontinuado pelo Pluggy em favor de
 * `GET /v2/transactions`, com paginação por cursor. `next` vem pronto pra usar (já é a própria
 * query string da próxima página, ex. `?accountId=...&after=...`) — NÃO é um token cru pra
 * remontar com `accountId=` de novo (confirmado batendo num 400 `INVALID_CURSOR` numa conexão
 * real: o erro da própria API explica isso melhor que a doc). */
export async function listTransactions(accountId: string): Promise<PluggyTransaction[]> {
  const transactions: PluggyTransaction[] = [];
  let path = `/v2/transactions?accountId=${accountId}`;
  for (;;) {
    const { results, next } = await pluggyFetch<{ results: PluggyTransaction[]; next: string | null }>(path);
    transactions.push(...results);
    if (!next) break;
    path = `/v2/transactions${next}`;
  }
  return transactions;
}

/** Registra (ou re-registra) o webhook pra `url`. O Pluggy não assina o payload — o header
 * customizado aqui é a nossa forma de conferir que a chamada é legítima (ver
 * `routes/connections.ts`). Chamar de novo depois que a URL pública mudar (ex.: ngrok reiniciou). */
export async function registerWebhook(url: string): Promise<{ id: string }> {
  return pluggyFetch('/webhooks', {
    method: 'POST',
    body: JSON.stringify({
      url,
      event: 'all',
      headers: env.PLUGGY_WEBHOOK_SECRET ? { 'x-planor-webhook-secret': env.PLUGGY_WEBHOOK_SECRET } : undefined,
    }),
  });
}
