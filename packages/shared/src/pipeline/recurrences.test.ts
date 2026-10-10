import { describe, expect, it } from 'vitest';
import { detectRecurrences, recurrenceMerchantKey, type RecurrenceTransaction } from './recurrences';

const NOW = new Date('2026-10-10T12:00:00Z');
let seq = 0;
const charge = (descriptionRaw: string, date: string, reais: number, categoryName: string | null = null): RecurrenceTransaction => ({
  id: `t${++seq}`,
  descriptionRaw,
  merchantName: null,
  postedAt: new Date(`${date}T12:00:00Z`),
  amountCents: -Math.round(reais * 100),
  categoryName,
});

describe('recurrenceMerchantKey', () => {
  it('ignora intermediador, caixa e código solto', () => {
    expect(recurrenceMerchantKey('Spotify P46c74f8c8')).toBe('spotify');
    expect(recurrenceMerchantKey('Spotify')).toBe('spotify');
  });
});

describe('detectRecurrences', () => {
  it('assinatura mensal com reajuste (caso real: Spotify R$ 31,90 → R$ 40,90)', () => {
    const [spotify] = detectRecurrences(
      [
        charge('Dm *Spotify', '2026-06-12', 31.9),
        charge('Dm *Spotify', '2026-07-12', 31.9),
        charge('Dm *Spotify', '2026-08-12', 40.9),
        charge('Dm *Spotify P46c74f8c8', '2026-09-12', 40.9),
      ],
      NOW,
    );

    expect(spotify).toMatchObject({ merchantKey: 'spotify', merchantName: 'Spotify', kind: 'subscription', amountCents: 4090, cadenceDays: 31, estimated: false });
    expect(spotify!.priceHistory.map((p) => p.amountCents)).toEqual([3190, 4090]);
    expect(spotify!.nextChargeAt.toISOString().slice(0, 10)).toBe('2026-10-13');
    expect(spotify!.transactionIds).toHaveLength(4);
  });

  it('duas assinaturas do mesmo serviço em dias diferentes (caso real: Adoreshare dia 8 e dia 27)', () => {
    const found = detectRecurrences(
      [
        charge('Adoreshare', '2026-07-27', 14.86),
        charge('Adoreshare', '2026-08-07', 15.13),
        charge('Adoreshare', '2026-08-27', 14.67),
        charge('Adoreshare', '2026-09-08', 15.11),
        charge('Adoreshare', '2026-09-27', 14.57),
      ],
      NOW,
    );
    expect(found).toHaveLength(2);
  });

  it('compra frequente que cai no intervalo por acaso não é assinatura', () => {
    const tiktok = ['2026-08-01', '2026-08-05', '2026-08-09', '2026-08-14', '2026-08-20', '2026-08-31', '2026-09-03', '2026-09-08', '2026-09-30'].map(
      (d) => charge('Ebn *Tiktok', d, 28.5),
    );
    expect(detectRecurrences(tiktok, NOW)).toEqual([]);
  });

  it('ignora IOF, série que parou há mais de 45 dias e cobrança única', () => {
    const found = detectRecurrences(
      [
        charge('IOF de "Adoreshare"', '2026-08-28', 2.75),
        charge('IOF de "Adoreshare"', '2026-09-27', 2.75),
        charge('Gestaodev', '2026-05-10', 29.99),
        charge('Gestaodev', '2026-06-10', 29.99),
        charge('Netflix', '2026-09-20', 39.9),
      ],
      NOW,
    );
    expect(found).toEqual([]);
  });

  it('queda de valor maior que 10% quebra a série', () => {
    expect(detectRecurrences([charge('Loja', '2026-08-15', 100), charge('Loja', '2026-09-15', 80)], NOW)).toEqual([]);
  });

  it('conta da casa vira fixo recorrente estimado pela média das 3 últimas', () => {
    const [vivo] = detectRecurrences(
      [
        charge('Conta Vivo', '2026-07-05', 80, 'Contas da casa'),
        charge('Conta Vivo', '2026-08-05', 83.82, 'Contas da casa'),
        charge('Conta Vivo', '2026-09-05', 87.77, 'Contas da casa'),
      ],
      NOW,
    );
    expect(vivo).toMatchObject({ kind: 'recurring_bill', amountCents: 8386, estimated: true });
  });
});
