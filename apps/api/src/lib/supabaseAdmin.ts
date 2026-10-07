// Cliente Supabase com a service_role key — só usar no servidor, nunca expor ao app. Usado pra
// validar o JWT de quem chama a API (ver src/lib/auth.ts) e pra operações administrativas.
import { createClient } from '@supabase/supabase-js';
import { env } from '../env';

function createSupabaseAdmin() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não definidas — copie .env.example para .env e preencha com os dados do projeto Supabase.',
    );
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Preguiçoso: só cria o client (e só então exige as env vars) na primeira vez que algo
// realmente precisar dele — assim rotas que não tocam auth/Supabase continuam funcionando
// mesmo sem essas chaves configuradas ainda.
let cached: ReturnType<typeof createSupabaseAdmin> | undefined;

export function getSupabaseAdmin() {
  if (!cached) cached = createSupabaseAdmin();
  return cached;
}
