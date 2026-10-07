// Variáveis de ambiente validadas com zod — falha cedo e com mensagem clara se faltar algo
// (ver .env.example na raiz do repo).

import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { z } from 'zod';

// Carrega sempre o .env da raiz do monorepo, não o do cwd de onde o comando foi disparado
// (apps/api/src/env.ts → raiz = 3 níveis acima).
config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL não definida'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  PLUGGY_CLIENT_ID: z.string().optional(),
  PLUGGY_CLIENT_SECRET: z.string().optional(),
  PLUGGY_WEBHOOK_SECRET: z.string().optional(),
  PLUGGY_WEBHOOK_BASE_URL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  REVENUECAT_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
