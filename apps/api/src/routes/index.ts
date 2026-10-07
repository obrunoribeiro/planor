import type { FastifyInstance } from 'fastify';
import { accountRoutes } from './accounts';
import { aiRoutes } from './ai';
import { alertRoutes } from './alerts';
import { categoryRoutes } from './categories';
import { connectionRoutes } from './connections';
import { futureRoutes } from './future';
import { goalRoutes } from './goals';
import { growthRoutes } from './growth';
import { healthRoutes } from './health';
import { homeRoutes } from './home';
import { householdRoutes } from './household';
import { meRoutes } from './me';
import { settingsRoutes } from './settings';
import { socialRoutes } from './social';
import { transactionRoutes } from './transactions';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes);
  await app.register(meRoutes);
  await app.register(settingsRoutes);
  await app.register(homeRoutes);
  await app.register(categoryRoutes);
  await app.register(accountRoutes);
  await app.register(connectionRoutes);
  await app.register(transactionRoutes);
  await app.register(futureRoutes);
  await app.register(goalRoutes);
  await app.register(alertRoutes);
  await app.register(aiRoutes);
  await app.register(householdRoutes);
  await app.register(socialRoutes);
  await app.register(growthRoutes);
}
