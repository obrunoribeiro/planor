// Fila de jobs (pg-boss em cima do Postgres do Supabase — CONTEXTO.md §3 e §9). O pg-boss cria
// o próprio schema (`pgboss`) no banco na primeira vez que sobe.
//
// Jobs que existem hoje:
//   - `sync-connection`: lê do Pluggy um item e grava contas/transações (webhook, "Atualizar
//     agora" ou a rodada agendada abaixo);
//   - `sync-all-connections` (a cada 6h): pede atualização de toda conexão ativa (§6.2, "a cada
//     4 a 6 horas");
//   - `consent-expiry-check` (diário, 9h): avisa consentimento vencendo e marca os vencidos;
//   - `process-transactions`: pipeline do §6.3 (normaliza, categoriza, recalcula agregados).
// O resto da tabela do §9 (alertas, plano da semana, push...) ainda não existe — ver PROGRESSO.md.
import PgBoss from 'pg-boss';
import { env } from '../env';

export const QUEUES = {
  syncConnection: 'sync-connection',
  syncAllConnections: 'sync-all-connections',
  consentExpiryCheck: 'consent-expiry-check',
  processTransactions: 'process-transactions',
} as const;

export type SyncConnectionJob = { userId: string; itemId: string };
export type ProcessTransactionsJob = { userId: string };

/** Quanto esperar entre pedir atualização ao Pluggy e ler o resultado — o item fica `UPDATING`
 * enquanto o Pluggy busca no banco (costuma levar de segundos a 1-2 min). */
export const SYNC_READ_DELAY_SECONDS = 180;

const TZ = 'America/Sao_Paulo';

let bossPromise: Promise<PgBoss> | null = null;

/** Sobe o pg-boss uma vez por processo (e cria as filas). Chamado tanto pelo servidor, que
 * também registra os workers, quanto por quem só precisa enfileirar. */
export function getBoss(): Promise<PgBoss> {
  bossPromise ??= (async () => {
    const boss = new PgBoss({ connectionString: env.DATABASE_URL, max: 4 });
    boss.on('error', (err) => console.error('[pg-boss]', err));
    await boss.start();
    // `stately`: no máximo um job esperando + um rodando por `singletonKey` (o usuário/item). Dez
    // webhooks seguidos do mesmo usuário viram uma sincronização, não dez.
    // `retryBackoff`: falhou, tenta de novo com intervalo crescente (§6.2, "tentar de novo
    // sozinho, com intervalos crescentes") — 60s, ~2min, ~4min...
    await boss.createQueue(QUEUES.syncConnection, {
      name: QUEUES.syncConnection,
      policy: 'stately',
      retryLimit: 5,
      retryDelay: 60,
      retryBackoff: true,
    });
    await boss.createQueue(QUEUES.processTransactions, {
      name: QUEUES.processTransactions,
      policy: 'stately',
      retryLimit: 3,
      retryDelay: 30,
      retryBackoff: true,
    });
    // Jobs agendados: `singleton` (um rodando por vez) — se uma rodada atrasar, a próxima não
    // sobrepõe. O cron do pg-boss é único no banco inteiro: mesmo com a API rodando em duas
    // máquinas (banco compartilhado, ver CONTRIBUTING.md), cada horário dispara uma vez só.
    await boss.createQueue(QUEUES.syncAllConnections, { name: QUEUES.syncAllConnections, policy: 'singleton' });
    await boss.createQueue(QUEUES.consentExpiryCheck, { name: QUEUES.consentExpiryCheck, policy: 'singleton' });
    await boss.schedule(QUEUES.syncAllConnections, '0 */6 * * *', {}, { tz: TZ });
    await boss.schedule(QUEUES.consentExpiryCheck, '0 9 * * *', {}, { tz: TZ });
    return boss;
  })().catch((err) => {
    bossPromise = null; // deixa tentar de novo na próxima chamada
    throw err;
  });
  return bossPromise;
}

export async function enqueueSyncConnection(data: SyncConnectionJob, opts?: { startAfterSeconds?: number }) {
  const boss = await getBoss();
  return boss.send(QUEUES.syncConnection, data, {
    singletonKey: `${data.userId}:${data.itemId}`,
    startAfter: opts?.startAfterSeconds,
  });
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
