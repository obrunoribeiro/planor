// Workers dos jobs — rodam no mesmo processo da API por enquanto (um processo só, custo baixo,
// CONTEXTO.md §3). Se um dia pesar, é só subir este arquivo num processo separado.
import type { FastifyBaseLogger } from 'fastify';
import { PluggyOwnershipError, syncItem } from '../lib/pluggySync';
import { processUserTransactions } from '../services/processTransactions';
import { getBoss, QUEUES, type ProcessTransactionsJob, type SyncConnectionJob } from './queue';

export async function startWorkers(log: FastifyBaseLogger) {
  const boss = await getBoss();

  await boss.work<SyncConnectionJob>(QUEUES.syncConnection, async ([job]) => {
    if (!job) return;
    try {
      // `syncItem` já enfileira o `process-transactions` no final.
      const result = await syncItem(job.data.userId, job.data.itemId);
      log.info({ jobId: job.id, ...result }, 'sync-connection concluído');
    } catch (err) {
      if (err instanceof PluggyOwnershipError) {
        // Não adianta tentar de novo — e é sinal de algo estranho, então loga alto e encerra.
        log.error({ err, jobId: job.id }, 'sync-connection recusado: item não pertence ao usuário');
        return;
      }
      throw err; // pg-boss tenta de novo (retryLimit)
    }
  });

  await boss.work<ProcessTransactionsJob>(QUEUES.processTransactions, async ([job]) => {
    if (!job) return;
    const result = await processUserTransactions(job.data.userId);
    log.info({ jobId: job.id, userId: job.data.userId, ...result }, 'process-transactions concluído');
  });
}
