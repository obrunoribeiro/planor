// Fila de jobs (pg-boss em cima do Postgres do Supabase — CONTEXTO.md §3 e §9). O pg-boss cria
// o próprio schema (`pgboss`) no banco na primeira vez que sobe.
//
// Jobs que existem hoje:
//   - `sync-connection`: webhook do Pluggy → busca o item e grava contas/transações;
//   - `process-transactions`: pipeline do §6.3 (normaliza, categoriza, recalcula agregados).
// O resto da tabela do §9 (atualização a cada 4-6h, consentimento vencendo, alertas, plano da
// semana...) ainda não existe — ver PROGRESSO.md.
import PgBoss from 'pg-boss';
import { env } from '../env';

export const QUEUES = {
  syncConnection: 'sync-connection',
  processTransactions: 'process-transactions',
} as const;

export type SyncConnectionJob = { userId: string; itemId: string };
export type ProcessTransactionsJob = { userId: string };

let bossPromise: Promise<PgBoss> | null = null;

/** Sobe o pg-boss uma vez por processo (e cria as filas). Chamado tanto pelo servidor, que
 * também registra os workers, quanto por quem só precisa enfileirar. */
export function getBoss(): Promise<PgBoss> {
  bossPromise ??= (async () => {
    const boss = new PgBoss({ connectionString: env.DATABASE_URL, max: 4 });
    boss.on('error', (err) => console.error('[pg-boss]', err));
    await boss.start();
    // `stately`: no máximo um job esperando + um rodando por `singletonKey` (o usuário). Dez
    // webhooks seguidos do mesmo usuário viram uma sincronização, não dez.
    await boss.createQueue(QUEUES.syncConnection, { name: QUEUES.syncConnection, policy: 'stately', retryLimit: 3, retryDelay: 60 });
    await boss.createQueue(QUEUES.processTransactions, { name: QUEUES.processTransactions, policy: 'stately', retryLimit: 3, retryDelay: 30 });
    return boss;
  })().catch((err) => {
    bossPromise = null; // deixa tentar de novo na próxima chamada
    throw err;
  });
  return bossPromise;
}

export async function enqueueSyncConnection(data: SyncConnectionJob) {
  const boss = await getBoss();
  return boss.send(QUEUES.syncConnection, data, { singletonKey: `${data.userId}:${data.itemId}` });
}

export async function enqueueProcessTransactions(userId: string) {
  const boss = await getBoss();
  return boss.send(QUEUES.processTransactions, { userId } satisfies ProcessTransactionsJob, { singletonKey: userId });
}

export async function stopBoss() {
  if (!bossPromise) return;
  const boss = await bossPromise;
  await boss.stop({ graceful: true });
  bossPromise = null;
}
