// Registra (ou atualiza) o webhook do Pluggy pra apontar pro `PLUGGY_WEBHOOK_BASE_URL` do
// .env — rodar de novo sempre que essa URL mudar (ex.: ngrok reiniciou). Ver CONTRIBUTING.md,
// "Open Finance (Pluggy) em desenvolvimento".
import { env } from '../env';
import { registerWebhook } from '../lib/pluggy';

async function main() {
  if (!env.PLUGGY_WEBHOOK_BASE_URL) {
    console.error('PLUGGY_WEBHOOK_BASE_URL não definida no .env — copie a URL do ngrok pra lá primeiro.');
    process.exit(1);
  }

  const url = `${env.PLUGGY_WEBHOOK_BASE_URL.replace(/\/$/, '')}/webhooks/aggregator`;
  const result = await registerWebhook(url);
  console.warn(`Webhook registrado: ${url} (id ${result.id})`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Falha ao registrar webhook:', err);
  process.exit(1);
});
