import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { config } from 'dotenv';
import postgres from 'postgres';

// packages/db/src/migrate.ts → raiz do monorepo é 3 níveis acima (src → db → packages → raiz).
config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL não definida — copie .env.example para .env na raiz do repo.');
}

const sql = postgres(connectionString, { max: 1, prepare: false });
const db = drizzle(sql);

await migrate(db, { migrationsFolder: './drizzle' });
await sql.end();

console.log('Migrações aplicadas.');
