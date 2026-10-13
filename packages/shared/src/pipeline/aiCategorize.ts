// Pipeline de dados, passo 2.3 — categorização por IA (CONTEXTO.md §6.3): só pro que as regras do
// usuário e o dicionário global não pegaram, com a categoria dentro de uma lista fechada.
//
// Privacidade (§10, "Anonimizar antes de mandar ao LLM"): vai só o nome do estabelecimento, sem
// números (CPF, CNPJ, conta, código de pedido), e só quando é um estabelecimento comercial —
// compra no cartão, compra no débito ou Pix/TED pra empresa (Ltda, S.A....). Pix pra pessoa
// ("Transferência enviada pelo Pix|Fulano de Tal") nunca vai: é nome de terceiro.

import { normalizeForMatch } from './normalize';

/** Abaixo disso a categoria da IA não é aplicada: a compra fica sem categoria e o usuário escolhe. */
export const AI_MIN_CONFIDENCE = 0.6;

const COMPANY_SUFFIX = /\b(?:ltda|s\.?\s?\/?\s?a|eireli|epp|cia|me|mei)\.?\s*$/i;
const CARD_PURCHASE_PREFIX = /^compra no d[eé]bito\|/i;

// Palavra que indica comércio: com ela, mesmo "Lanches da Maria" é estabelecimento.
const BUSINESS_WORDS = new Set(
  'ltda me mei eireli epp sa cia comercio comercial loja lojas rest restaurante bar lanches lanchonete pizzaria padaria mercado mercearia supermercado atacado farmacia drogaria posto auto pecas shop store market burger sorvetes doces cafe bistro grill hotel pousada servicos service tecnologia digital studio estudio academia clinica odonto otica moda modas calcados confeccoes distribuidora importacao brasil center centro'.split(
    ' ',
  ),
);
const NAME_SUFFIXES = new Set(['junior', 'jr', 'filho', 'neto', 'sobrinho']);
// Prenomes e sobrenomes mais comuns no Brasil (e os que já apareceram em dado real). Não precisa
// ser completo — na dúvida o nome vai sem número e a IA costuma responder "não sei" pra pessoa.
const COMMON_NAMES = new Set(
  (
    'silva santos oliveira souza sousa rodrigues ferreira alves pereira lima gomes costa ribeiro martins carvalho almeida lopes soares fernandes vieira barbosa rocha dias nascimento andrade moreira nunes marques machado mendes freitas cardoso ramos goncalves santana teixeira moura cavalcanti araujo pinto correia castro campos borges batista reis monteiro miranda sanchez zacalusni pendek ' +
    'jose joao maria ana antonio francisco carlos paulo pedro lucas luiz luis marcos gabriel rafael daniel marcelo bruno eduardo felipe rodrigo jefferson fernando gustavo leonardo fabio juliana mariana fernanda patricia aline camila amanda bruna jessica leticia julia beatriz larissa rafaela nelson arminda claudete sandra simone adriana vanessa roberto ricardo sergio andre alexandre diego thiago tiago vinicius matheus mateus henrique silvane aparecida'
  ).split(' '),
);

/**
 * Parece nome de pessoa ("Arminda Claudete da Silva Ribeiro", "Nelson Zacalusni Gonçalves
 * Junior")? 2+ palavras, sem palavra de comércio, e com prenome/sobrenome comum ou sufixo
 * ("Junior", "Filho"). Quem vende na maquininha como pessoa física ou MEI aparece assim na fatura
 * — e nome de terceiro não vai pra IA (§10).
 */
export function looksLikePersonName(merchantName: string): boolean {
  const words = normalizeForMatch(merchantName.replace(/\d+/g, ' ')).split(' ').filter(Boolean);
  if (words.length < 2) return false;
  if (words.some((w) => BUSINESS_WORDS.has(w))) return false;
  return words.some((w) => NAME_SUFFIXES.has(w) || COMMON_NAMES.has(w));
}

export function isAiEligible(tx: {
  descriptionRaw: string;
  merchantName: string;
  accountType: 'checking' | 'savings' | 'credit_card';
}): boolean {
  if (looksLikePersonName(tx.merchantName)) return false;
  if (tx.accountType === 'credit_card') return true;
  if (CARD_PURCHASE_PREFIX.test(tx.descriptionRaw)) return true;
  return COMPANY_SUFFIX.test(tx.merchantName.trim());
}

/**
 * Nome que pode ir pro provedor: sem sequências de 3+ dígitos (CPF, CNPJ, conta, código) e sem
 * espaço sobrando. `null` quando não sobra nome (ex.: "51478247").
 */
export function merchantNameForAi(merchantName: string): string | null {
  // Número solto (separado por espaço, ponto, traço ou barra) com 3+ dígitos no total. Dígito
  // grudado em letra ("G1ai101m") é parte do nome e fica — a não ser que seja uma sequência longa
  // (5+), que é documento ou código mesmo grudado ("51478247Jean").
  const cleaned = merchantName
    .replace(/\d{5,}/g, ' ')
    .replace(/(?<![a-zA-Z])\d[\d.\-/ ]*\d(?![a-zA-Z])/g, (run) =>
      run.replace(/\D/g, '').length >= 3 ? ' ' : run,
    )
    .replace(/\s+/g, ' ')
    .trim();
  return /[a-zA-ZÀ-ÿ]{2,}/.test(cleaned) ? cleaned : null;
}

/** Chave do cache da resposta da IA — mesmo estabelecimento, mesma resposta. */
export function aiMerchantKey(merchantName: string): string {
  return normalizeForMatch(merchantName);
}

/**
 * Nome de uma transação pra mandar ao chat da IA (§6.7, "tirar CPF, números de conta e nomes de
 * terceiros"): o nome sem números, ou um rótulo genérico quando é Pix/transferência pra pessoa ou
 * nome que parece de pessoa.
 */
export function transactionNameForAi(tx: {
  descriptionRaw: string;
  merchantName: string | null;
}): string {
  const name = tx.merchantName ?? tx.descriptionRaw;
  const isTransfer = /transfer[eê]ncia|\bpix\b|\bted\b|\bdoc\b/i.test(tx.descriptionRaw);
  if (looksLikePersonName(name) || (isTransfer && !COMPANY_SUFFIX.test(name.trim()))) {
    return isTransfer ? 'Transferência para pessoa' : 'Compra com pessoa física';
  }
  return merchantNameForAi(name) ?? 'Sem nome';
}
