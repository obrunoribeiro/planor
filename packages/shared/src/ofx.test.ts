import { describe, expect, it } from 'vitest';
import { parseOfx } from './ofx';

const SAMPLE_OFX = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<DTSTART>20261001000000
<DTEND>20261031235959
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261004000000[-3:BRT]
<TRNAMT>-62.90
<FITID>20261004001
<MEMO>IFOOD *PIZZARIA BELLA
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261005090000[-3:BRT]
<TRNAMT>6500.00
<FITID>20261005001
<MEMO>SALARIO EMPRESA XPTO
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261008
<TRNAMT>-43.50
<FITID>20261008001
<NAME>IFOOD *TEMAKERIA
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;

describe('parseOfx', () => {
  it('extrai as 3 transações do extrato de exemplo', () => {
    const result = parseOfx(SAMPLE_OFX);
    expect(result).toHaveLength(3);
  });

  it('lê valor em centavos com sinal certo (saída negativa, entrada positiva)', () => {
    const [first, second] = parseOfx(SAMPLE_OFX);
    expect(first!.amountCents).toBe(-6290);
    expect(second!.amountCents).toBe(650_000);
  });

  it('usa FITID como externalId e MEMO (ou NAME, se não tiver MEMO) como descrição', () => {
    const [first, , third] = parseOfx(SAMPLE_OFX);
    expect(first!.externalId).toBe('20261004001');
    expect(first!.descriptionRaw).toBe('IFOOD *PIZZARIA BELLA');
    expect(third!.descriptionRaw).toBe('IFOOD *TEMAKERIA');
  });

  it('converte a data com fuso explícito -03:00 pro instante UTC certo', () => {
    const [first] = parseOfx(SAMPLE_OFX);
    // 2026-10-04 00:00 em -03:00 = 2026-10-04 03:00 UTC
    expect(first!.postedAt.toISOString()).toBe('2026-10-04T03:00:00.000Z');
  });

  it('sem fuso explícito e sem hora, assume -03:00 (Brasil) e meia-noite', () => {
    const [, , third] = parseOfx(SAMPLE_OFX);
    expect(third!.postedAt.toISOString()).toBe('2026-10-08T03:00:00.000Z');
  });

  it('ignora blocos sem FITID/DTPOSTED/TRNAMT', () => {
    const incomplete = `<STMTTRN>\n<TRNTYPE>DEBIT\n<MEMO>Sem FITID nem data\n</STMTTRN>`;
    expect(parseOfx(incomplete)).toHaveLength(0);
  });
});
