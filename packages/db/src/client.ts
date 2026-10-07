import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export function createDb(connectionString: string) {
  // prepare: false — a connection pooler do Supabase em modo "Transaction" (porta 6543) não
  // mantém estado de sessão entre queries, então prepared statements (o padrão do postgres.js)
  // quebram com esse tipo de conexão. Funciona normalmente em modo "Session" ou conexão direta.
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
