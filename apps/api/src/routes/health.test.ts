import { describe, expect, it } from 'vitest';
import { buildApp } from '../app';

describe('GET /health', () => {
  it('responde ok: true', async () => {
    const app = await buildApp();
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true, service: 'planor-api' });

    await app.close();
  });
});
