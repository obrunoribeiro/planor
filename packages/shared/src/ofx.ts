// Parser de extrato OFX — CONTEXTO.md §6.2: "Importar fatura (PDF/OFX) funciona com qualquer
// banco: OFX é lido por um parser." OFX é SGML (não XML de verdade): tags sem fechamento por
// campo, só a lista inteira (`<STMTTRN>...</STMTTRN>`) fecha. Isso cobre o bastante dos extratos
// de banco brasileiro pra extrair id, data, valor e descrição — não é um parser OFX completo
// (não lê saldo, juros, etc., que não interessam aqui).
export type OfxTransaction = {
  /** `FITID` do arquivo — usado como `transactions.externalId` pra deduplicar (§6.3, passo 1). */
  externalId: string;
  postedAt: Date;
  /** Centavos; saídas negativas, igual ao resto do banco (CLAUDE.md, princípio 4). */
  amountCents: number;
  descriptionRaw: string;
};

function extractField(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}>([^\\r\\n<]*)`, 'i'));
  return match ? (match[1] ?? '').trim() : null;
}

/** "20261004120000[-3:BRT]" ou só "20261004" → Date em UTC. Sem fuso explícito, assume -03:00
 * (Brasil, sem horário de verão desde 2019) — a imensa maioria dos OFX daqui não leva fuso. */
function parseOfxDate(raw: string): Date {
  const digits = raw.slice(0, 14).padEnd(14, '0');
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const hour = Number(digits.slice(8, 10));
  const minute = Number(digits.slice(10, 12));
  const second = Number(digits.slice(12, 14));

  const tzMatch = raw.match(/\[([+-]?\d+(?:\.\d+)?)/);
  const offsetHours = tzMatch ? Number(tzMatch[1]) : -3;

  return new Date(Date.UTC(year, month - 1, day, hour - offsetHours, minute, second));
}

/** Extrai as transações de um arquivo OFX. Ignora blocos sem `FITID`, `DTPOSTED` ou `TRNAMT` —
 * campos incompletos não dá pra importar com segurança. */
export function parseOfx(content: string): OfxTransaction[] {
  const blocks = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
  const transactions: OfxTransaction[] = [];

  for (const block of blocks) {
    const fitId = extractField(block, 'FITID');
    const dtPosted = extractField(block, 'DTPOSTED');
    const trnAmt = extractField(block, 'TRNAMT');
    if (!fitId || !dtPosted || !trnAmt) continue;

    const memo = extractField(block, 'MEMO') ?? extractField(block, 'NAME');

    transactions.push({
      externalId: fitId,
      postedAt: parseOfxDate(dtPosted),
      amountCents: Math.round(Number(trnAmt) * 100),
      descriptionRaw: memo || 'Transação importada',
    });
  }

  return transactions;
}
