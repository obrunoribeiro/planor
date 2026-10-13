import { describe, expect, it } from 'vitest';
import {
  categoryLimitStatus,
  goalCaption,
  limitAlertCents,
  purchasesWithinLimit,
  monthsUntil,
  paceCents,
  projectedFinishMonth,
  suggestedPaceText,
  weeksUntil,
} from './goals';

const plain = (text: string | null) => text?.replace(/\u00a0/g, ' ');

describe('ritmo', () => {
  it('Nova meta: R$ 4.000 em 12 meses dá R$ 333,33 por mês (Figma 51:1322)', () => {
    expect(paceCents({ targetCents: 400_000, savedCents: 0, periods: 12 })).toBe(33_333);
  });

  it('meses e semanas até o prazo, nunca menos que 1', () => {
    expect(monthsUntil('2026-10-12', '2026-12-15')).toBe(2);
    expect(monthsUntil('2026-10-12', '2026-10-30')).toBe(1);
    expect(weeksUntil('2026-10-12', '2026-12-15')).toBe(10);
    expect(weeksUntil('2026-10-12', '2026-10-10')).toBe(1);
  });

  it('no ritmo atual: o guardado por mês desde a criação, projetado', () => {
    // R$ 200 guardados em outubro (criada em outubro) → faltam R$ 1.800 → 9 meses → julho/27.
    expect(
      projectedFinishMonth({
        targetCents: 200_000,
        savedCents: 20_000,
        createdKey: '2026-10-01',
        todayKey: '2026-10-12',
      }),
    ).toBe('2027-07');
    expect(
      projectedFinishMonth({
        targetCents: 200_000,
        savedCents: 0,
        createdKey: '2026-10-01',
        todayKey: '2026-10-12',
      }),
    ).toBeNull();
  });
});

describe('categoryLimitStatus', () => {
  const base = {
    targetCents: 30_000,
    alertAtPct: 0.8,
    startsMonth: '2026-11',
    monthKey: '2026-11',
  };
  it('ok, aviso em 80% e estourado', () => {
    expect(categoryLimitStatus({ ...base, spentCents: 10_000 })).toBe('ok');
    expect(categoryLimitStatus({ ...base, spentCents: 24_000 })).toBe('warning');
    expect(categoryLimitStatus({ ...base, spentCents: 30_001 })).toBe('exceeded');
  });
  it('antes do mês de início não conta; sem aviso configurado, só estoura', () => {
    expect(categoryLimitStatus({ ...base, spentCents: 50_000, monthKey: '2026-10' })).toBe(
      'not_started',
    );
    expect(categoryLimitStatus({ ...base, alertAtPct: null, spentCents: 29_000 })).toBe('ok');
  });
});

describe('goalCaption', () => {
  it('com prazo: até a data, guardando por mês (Figma 51:1177)', () => {
    expect(
      plain(
        goalCaption(
          {
            type: 'savings',
            targetCents: 300_000,
            savedCents: 45_000,
            deadline: '2026-12-15',
            createdKey: '2026-09-01',
          },
          '2026-10-12',
        ),
      ),
    ).toBe('Até 15 de dezembro · guarde R$ 1.275,00 por mês');
  });
  it('prazo em outro ano mostra o ano', () => {
    expect(
      plain(
        goalCaption(
          {
            type: 'savings',
            targetCents: 400_000,
            savedCents: 50_000,
            deadline: '2027-10-12',
            createdKey: '2026-10-12',
          },
          '2026-10-12',
        ),
      ),
    ).toBe('Até 12 de outubro de 2027 · guarde R$ 291,67 por mês');
  });
  it('sem prazo: o que falta e quando completa no ritmo atual', () => {
    expect(
      plain(
        goalCaption(
          {
            type: 'savings',
            targetCents: 200_000,
            savedCents: 20_000,
            deadline: null,
            createdKey: '2026-10-01',
          },
          '2026-10-12',
        ),
      ),
    ).toBe('Faltam R$ 1.800,00 · no ritmo atual, em julho');
    expect(
      plain(
        goalCaption(
          {
            type: 'savings',
            targetCents: 100,
            savedCents: 100,
            deadline: null,
            createdKey: '2026-10-01',
          },
          '2026-10-12',
        ),
      ),
    ).toBe('Meta alcançada');
  });
  it('limite: começa no mês que vem, sobra e estouro', () => {
    const limit = {
      type: 'category_limit' as const,
      targetCents: 30_000,
      alertAtPct: 0.8,
      startsMonth: '2026-11',
    };
    expect(goalCaption({ ...limit, spentCents: 0 }, '2026-10-12')).toBe('Começa em 1º de novembro');
    expect(plain(goalCaption({ ...limit, spentCents: 10_000 }, '2026-11-05'))).toBe(
      'Sobram R$ 200,00 este mês',
    );
    expect(plain(goalCaption({ ...limit, spentCents: 35_000 }, '2026-11-05'))).toBe(
      'Passou R$ 50,00 do limite este mês',
    );
  });
});

describe('suggestedPaceText', () => {
  it('por semana até o prazo', () => {
    expect(
      plain(
        suggestedPaceText(
          {
            type: 'savings',
            targetCents: 200_000,
            savedCents: 20_000,
            deadline: '2026-12-15',
            createdKey: '2026-10-01',
          },
          '2026-10-12',
        ),
      ),
    ).toBe('R$ 180,00 por semana completa a meta até 15 de dezembro.');
  });
});

describe('sheet "Criar limite"', () => {
  it('R$ 300 com ticket de R$ 35,62 dá cerca de 8 pedidos; aviso em R$ 240', () => {
    expect(purchasesWithinLimit(30_000, 3_562)).toBe(8);
    expect(purchasesWithinLimit(30_000, null)).toBeNull();
    expect(limitAlertCents(30_000, 0.8)).toBe(24_000);
  });
});
