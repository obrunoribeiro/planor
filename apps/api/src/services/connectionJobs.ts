// Jobs agendados das conexões bancárias — CONTEXTO.md §6.2 e §9:
//   - `sync-all-connections`: atualização automática a cada 4 a 6 horas;
//   - `consent-expiry-check`: avisos de consentimento vencendo (7 e 1 dia antes) e marcar vencidos.
// Os alertas vão pra tabela `alerts` (§6.9). Push ainda não existe (`push-dispatcher`, §9) — o
// aviso aparece só dentro do app por enquanto (ver PROGRESSO.md).
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { alerts, connections, institutions } from '@planor/db';
import { checkConsent } from '@planor/shared';
import { db } from '../lib/db';
import { isItemGone, requestItemRefresh } from '../lib/pluggy';
import { enqueueSyncConnection, SYNC_READ_DELAY_SECONDS } from '../jobs/queue';

/** Pede ao Pluggy que atualize cada conexão ativa e agenda a leitura: alguns minutos depois se o
 * pedido foi aceito, na hora se não (plano Meu Pluggy não aceita — aí a rodada só relê o que o
 * meu.pluggy.ai já trouxe sozinho, ver `requestItemRefresh`). A leitura não depende do webhook
 * chegar (em dev, sem ngrok, ele não chega). Conexão com erro também entra — o erro pode ter
 * sido passageiro. Desconectada ou com consentimento vencido não: só volta por "Renovar acesso". */
export async function syncAllConnections(log: { warn: (obj: object, msg: string) => void }) {
  const rows = await db
    .select({ userId: connections.userId, itemId: connections.aggregatorItemId })
    .from(connections)
    .where(inArray(connections.status, ['connected', 'error']));

  let triggered = 0;
  let gone = 0;
  for (const row of rows) {
    let refreshed = false;
    try {
      refreshed = (await requestItemRefresh(row.itemId)) === 'requested';
    } catch (err) {
      if (isItemGone(err)) {
        await markItemGone(row.itemId);
        gone += 1;
        continue;
      }
      // Ex.: banco pede MFA de novo. A leitura abaixo ainda roda e grava o status/erro que o
      // Pluggy devolver — é assim que o usuário fica sabendo.
      log.warn({ err, itemId: row.itemId }, 'falha ao pedir atualização do item ao Pluggy');
    }
    if (refreshed) triggered += 1;
    await enqueueSyncConnection(row, { startAfterSeconds: refreshed ? SYNC_READ_DELAY_SECONDS : 0 });
  }
  return { connections: rows.length, triggered, gone };
}

/** Avisos de 7 e 1 dia antes de o consentimento vencer, e marca como `consent_expired` o que já
 * venceu. Rodar duas vezes no mesmo dia não duplica aviso (confere os já enviados pra esta mesma
 * data de vencimento — renovar o acesso muda a data e "zera" os avisos). */
export async function checkConsentExpiry(now = new Date()) {
  const rows = await db
    .select({
      id: connections.id,
      userId: connections.userId,
      consentExpiresAt: connections.consentExpiresAt,
      institutionName: institutions.name,
    })
    .from(connections)
    .innerJoin(institutions, eq(institutions.id, connections.institutionId))
    .where(and(inArray(connections.status, ['connected', 'error']), isNotNull(connections.consentExpiresAt)));

  let warned = 0;
  let expired = 0;
  for (const row of rows) {
    const expiresAt = row.consentExpiresAt!;
    const expiresAtIso = expiresAt.toISOString();

    const sent = await db
      .select({ warningDay: sql<number>`(${alerts.payload}->>'warningDay')::int` })
      .from(alerts)
      .where(
        and(
          eq(alerts.userId, row.userId),
          eq(alerts.type, 'consent_expiring'),
          sql`${alerts.payload}->>'connectionId' = ${row.id}`,
          sql`${alerts.payload}->>'expiresAt' = ${expiresAtIso}`,
        ),
      );

    const result = checkConsent(
      expiresAt,
      now,
      sent.map((s) => s.warningDay),
    );

    if (result.action === 'warn') {
      await db.insert(alerts).values({
        userId: row.userId,
        type: 'consent_expiring',
        payload: {
          connectionId: row.id,
          institutionName: row.institutionName,
          warningDay: result.warningDay,
          daysLeft: result.daysLeft,
          expiresAt: expiresAtIso,
        },
      });
      warned += 1;
    } else if (result.action === 'expire') {
      await markConnectionStatus(row.id, row.userId, 'consent_expired', row.institutionName);
      expired += 1;
    }
  }
  return { checked: rows.length, warned, expired };
}

type ConnectionStatus = 'connected' | 'error' | 'consent_expired' | 'disconnected';

/** Alerta quando uma conexão QUEBRA (§6.9: `sync_failed` / `bank_disconnected`, destino "Contas
 * e cartões"). Só na transição — uma conexão que continua com erro a cada 6h não gera alerta novo
 * toda vez. */
export async function alertOnStatusChange(opts: {
  userId: string;
  connectionId: string;
  institutionName: string;
  previous: ConnectionStatus | null;
  next: ConnectionStatus;
  errorCode?: string | null;
}) {
  if (opts.previous === opts.next) return;
  const type = opts.next === 'error' ? 'sync_failed' : opts.next === 'consent_expired' ? 'bank_disconnected' : null;
  if (!type) return;
  await db.insert(alerts).values({
    userId: opts.userId,
    type,
    payload: { connectionId: opts.connectionId, institutionName: opts.institutionName, errorCode: opts.errorCode ?? null },
  });
}

/** Item sumiu do Pluggy (404). `disconnected` não gera alerta: no caso real o usuário apagou a
 * conexão (aqui ou no Meu Pluggy) e já sabe. */
export async function markItemGone(itemId: string) {
  await db.update(connections).set({ status: 'disconnected' }).where(eq(connections.aggregatorItemId, itemId));
}

async function markConnectionStatus(connectionId: string, userId: string, status: ConnectionStatus, institutionName: string) {
  const [previous] = await db.select({ status: connections.status }).from(connections).where(eq(connections.id, connectionId));
  await db.update(connections).set({ status }).where(eq(connections.id, connectionId));
  await alertOnStatusChange({ userId, connectionId, institutionName, previous: previous?.status ?? null, next: status });
}
