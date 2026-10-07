import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // `postgres-js` só conecta de verdade na primeira query — instanciar o client com uma URL
    // falsa (pra passar a validação do zod em env.ts) é suficiente pra rotas que não tocam o
    // banco, como /health. Rotas que tocam o banco de verdade ganham teste de integração à
    // parte quando forem implementadas (Fase 2+).
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    },
  },
});
