import type { FastifyReply } from 'fastify';

/**
 * Placeholder de rota ainda não implementada. Fase 0 só desenha a superfície da API (ver
 * CONTEXTO.md §8); a lógica real entra conforme a "Ordem de implementação" do §13.
 */
export function notImplemented(reply: FastifyReply, note: string) {
  return reply.code(501).send({ error: 'not_implemented', note });
}
