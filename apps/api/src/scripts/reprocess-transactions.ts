// Roda o pipeline (CONTEXTO.md §6.3) direto, sem passar pela fila — pra reprocessar transações
// que entraram antes do pipeline existir, ou depois de mudar o dicionário de regras globais
// (`packages/shared/src/pipeline/categorize.ts`). Idempotente.
//
//   pnpm --filter @planor/api pipeline:reprocess <e-mail>    # um usuário
//   pnpm --filter @planor/api pipeline:reprocess --all       # todo mundo que tem transação
import { eq, sql } from 'drizzle-orm';
import { transactions, users } from '@planor/db';
import { db } from '../lib/db';
import { processUserTransactions } from '../services/processTransactions';

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Uso: pipeline:reprocess <e-mail> | --all');
    process.exit(1);
  }

  const userIds =
    arg === '--all'
      ? (await db.selectDistinct({ id: transactions.userId }).from(transactions)).map((r) => r.id)
      : (await db.select({ id: users.id }).from(users).where(eq(sql`lower(${users.email})`, arg.toLowerCase()))).map((r) => r.id);

  if (userIds.length === 0) {
    console.error(`Nenhum usuário encontrado pra "${arg}".`);
    process.exit(1);
  }

  for (const userId of userIds) {
    const result = await processUserTransactions(userId);
    console.warn(`${userId}: ${result.updated} transações atualizadas, ${result.months} meses recalculados`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Falha ao reprocessar:', err);
  process.exit(1);
});
