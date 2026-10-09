// Pipeline de dados, passo 1 — normalização (CONTEXTO.md §6.3). Só regras mecânicas: tirar
// prefixo de intermediador de pagamento, sufixo de parcela e código numérico. Chegar no nome
// comercial bonito ("IFOOD *PIZZARIA BELLA" → "Pizzaria Bella Massa") exige um dicionário de
// estabelecimentos ou IA — fica fora daqui (ver PROGRESSO.md).

/** Minúsculas, sem acento, só letras/números separados por um espaço. Base de toda comparação
 * de texto do pipeline (regras globais e do usuário). */
export function normalizeForMatch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Prefixos de intermediador/adquirente que aparecem antes do nome do estabelecimento na fatura
// (Mercado Pago, PagSeguro, iFood, Ebanx, dLocal, Zoop...). Ordem importa: o mais longo primeiro.
const INTERMEDIARY_PREFIX =
  /^(?:ifood|ifd|mp|mercadopago|pag|pg|pagseguro|ec|ebn|ebanx|dm|dlocal|demerge bras|zp|bee|jim\.com|pp|paypal|sumup|stone|cielo|getnet|iz|ton|htm)\s*\*+\s*/i;

// "3/10", "03/10", "PARC 03/10", "PARCELA 3 DE 10" no fim da descrição.
const INSTALLMENT_SUFFIX = /\s+(?:parc(?:ela)?\.?\s*)?\d{1,2}\s*(?:\/|de)\s*\d{1,2}\s*$/i;

const LOWERCASE_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word, i) => (i > 0 && LOWERCASE_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

/**
 * Nome do estabelecimento a partir da descrição crua do banco:
 * - "Transferência enviada pelo Pix|Fulano" → "Fulano" (o Pluggy junta tipo e contraparte com "|");
 * - tira prefixo de intermediador ("Ebn *Tiktok" → "Tiktok", "Ifd*47139681 Joao" → "Joao");
 * - tira sufixo de parcela ("Cold City 2/3" → "Cold City");
 * - Title Case só quando vier tudo em maiúsculas (não estraga "iFood" ou "McDonald's").
 */
export function normalizeMerchantName(descriptionRaw: string): string {
  let name = descriptionRaw.replace(/\s+/g, ' ').trim();

  const pipe = name.lastIndexOf('|');
  if (pipe >= 0 && pipe < name.length - 1) name = name.slice(pipe + 1).trim();

  name = name.replace(INTERMEDIARY_PREFIX, '');
  name = name.replace(INSTALLMENT_SUFFIX, '');
  // Código numérico solto no começo (id de pedido/terminal): "47139681 Joao Carl" → "Joao Carl".
  name = name.replace(/^\d{4,}\s+/, '');
  name = name.trim();

  if (!name) return descriptionRaw.trim();
  return name === name.toUpperCase() && /[A-Z]/.test(name) ? titleCase(name) : name;
}

