import { describe, expect, it } from 'vitest';
import { monthRangeSaoPaulo } from './dates';

describe('monthRangeSaoPaulo', () => {
  it('outubro/2026: começa 01/10 00:00 em São Paulo (03:00 UTC) e termina 01/11 00:00 (exclusivo)', () => {
    const { start, end } = monthRangeSaoPaulo('2026-10');

    expect(start.toISOString()).toBe('2026-10-01T03:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-01T03:00:00.000Z');
  });

  it('dezembro vira janeiro do ano seguinte', () => {
    const { end } = monthRangeSaoPaulo('2026-12');

    expect(end.toISOString()).toBe('2027-01-01T03:00:00.000Z');
  });
});
