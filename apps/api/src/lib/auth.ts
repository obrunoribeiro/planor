import { users } from '@planor/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { db } from './db';
import { getSupabaseAdmin } from './supabaseAdmin';

/**
 * Valida o header `Authorization: Bearer <jwt>` contra o Supabase Auth, garante que existe uma
 * linha correspondente em `public.users` (cria no primeiro request autenticado de cada pessoa —
 * o Supabase Auth não sabe nada do nosso schema) e devolve o id do usuário.
 *
 * Em caso de falha, já manda a resposta 401/500 — quem chama só precisa checar por `null`.
 */
export async function requireUserId(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;

  if (!token) {
    reply.code(401).send({ error: 'unauthorized', note: 'Header Authorization: Bearer <token> ausente.' });
    return null;
  }

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) {
    reply.code(401).send({ error: 'unauthorized', note: 'Token inválido ou expirado.' });
    return null;
  }

  const authUser = data.user;
  if (!authUser.email) {
    reply.code(500).send({ error: 'user_without_email', note: 'Usuário do Supabase Auth sem e-mail — não deveria acontecer com login por OTP.' });
    return null;
  }

  await db
    .insert(users)
    .values({ id: authUser.id, email: authUser.email })
    .onConflictDoNothing({ target: users.id });

  return authUser.id;
}
