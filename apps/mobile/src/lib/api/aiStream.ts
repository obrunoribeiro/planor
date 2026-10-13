// `POST /ai/chat?stream=1` (SSE) — a resposta da Planor IA chega aos pedaços (`delta`) e termina
// com `done` (mesmo corpo do `POST /ai/chat` sem stream). O `fetch` do React Native não lê o corpo
// aos poucos; o de `expo/fetch` lê.
import { fetch } from 'expo/fetch';
import { ApiError } from './client';
import type { AiChatResponse } from './types';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function streamAiChat(input: {
  accessToken: string;
  conversationId?: string;
  message: string;
  onDelta: (text: string) => void;
}): Promise<AiChatResponse> {
  if (!API_URL)
    throw new Error(
      'EXPO_PUBLIC_API_URL não definida — copie .env.example para .env na raiz do repo.',
    );

  const response = await fetch(`${API_URL}/ai/chat?stream=1`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ conversationId: input.conversationId, message: input.message }),
  });
  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(response.status, body.error ?? `Erro ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // Eventos SSE separados por linha em branco: "event: x\ndata: {...}".
    let separator = buffer.indexOf('\n\n');
    while (separator !== -1) {
      const raw = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      separator = buffer.indexOf('\n\n');
      const event = raw.match(/^event: (.+)$/m)?.[1];
      const data = raw.match(/^data: (.+)$/m)?.[1];
      if (!event || !data) continue;
      const payload = JSON.parse(data) as Record<string, unknown>;
      if (event === 'delta') input.onDelta(payload.text as string);
      if (event === 'error') throw new ApiError(503, (payload.error as string) ?? 'ai_unavailable');
      if (event === 'done') return payload as unknown as AiChatResponse;
    }
  }
  throw new ApiError(503, 'ai_unavailable');
}
