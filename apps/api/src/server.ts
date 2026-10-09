import { buildApp } from './app';
import { env } from './env';
import { stopBoss } from './jobs/queue';
import { startWorkers } from './jobs/workers';

const app = await buildApp();

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// Fila de jobs (§9) sobe depois da API: se o pg-boss falhar, as rotas continuam no ar — só o
// processamento em segundo plano fica parado (e aparece no log).
startWorkers(app.log).catch((err) => app.log.error(err, 'falha ao iniciar os workers do pg-boss'));

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await app.close();
    await stopBoss();
    process.exit(0);
  });
}
