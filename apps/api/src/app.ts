import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import sensible from '@fastify/sensible';
import Fastify from 'fastify';
import { registerRoutes } from './routes/index';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(sensible);
  // Importar fatura (OFX/PDF) — CONTEXTO.md §6.2. 10MB cobre qualquer extrato/fatura real.
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  await app.register(registerRoutes);

  return app;
}
