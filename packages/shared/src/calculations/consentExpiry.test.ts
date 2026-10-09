import { describe, expect, it } from 'vitest';
import { checkConsent, daysUntilSaoPaulo } from './consentExpiry';

// 9h em Brasília de 08/10/2026 (= 12h UTC), o horário do job diário.
const now = new Date('2026-10-08T12:00:00Z');

describe('daysUntilSaoPaulo', () => {
  it('conta dias de calendário em Brasília, não blocos de 24h', () => {
    expect(daysUntilSaoPaulo(new Date('2026-10-09T11:00:00Z'), now)).toBe(1); // amanhã às 8h
    expect(daysUntilSaoPaulo(new Date('2026-10-08T23:00:00Z'), now)).toBe(0); // hoje às 20h
    // 01h UTC do dia 09 ainda é 22h do dia 08 em Brasília.
    expect(daysUntilSaoPaulo(new Date('2026-10-09T01:00:00Z'), now)).toBe(0);
    expect(daysUntilSaoPaulo(new Date('2026-10-07T12:00:00Z'), now)).toBe(-1);
  });
});

describe('checkConsent', () => {
  const inDays = (days: number) => new Date(now.getTime() + days * 86_400_000);

  it('nada a fazer com mais de 7 dias', () => {
    expect(checkConsent(inDays(30), now, [])).toEqual({ action: 'none' });
    expect(checkConsent(inDays(8), now, [])).toEqual({ action: 'none' });
  });

  it('avisa no marco de 7 dias, uma vez só', () => {
    expect(checkConsent(inDays(7), now, [])).toEqual({ action: 'warn', warningDay: 7, daysLeft: 7 });
    expect(checkConsent(inDays(6), now, [7])).toEqual({ action: 'none' });
  });

  it('se o job perdeu o dia exato, avisa no dia seguinte', () => {
    expect(checkConsent(inDays(6), now, [])).toEqual({ action: 'warn', warningDay: 7, daysLeft: 6 });
  });

  it('avisa no marco de 1 dia mesmo já tendo avisado o de 7', () => {
    expect(checkConsent(inDays(1), now, [7])).toEqual({ action: 'warn', warningDay: 1, daysLeft: 1 });
    expect(checkConsent(inDays(0), now, [7, 1])).toEqual({ action: 'none' });
  });

  it('pulando direto pra perto do fim, só o aviso mais próximo sai', () => {
    expect(checkConsent(inDays(1), now, [])).toEqual({ action: 'warn', warningDay: 1, daysLeft: 1 });
  });

  it('vencido vira expire', () => {
    expect(checkConsent(inDays(-1), now, [7, 1])).toEqual({ action: 'expire' });
  });
});
