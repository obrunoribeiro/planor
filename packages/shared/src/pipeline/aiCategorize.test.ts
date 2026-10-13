import { describe, expect, it } from 'vitest';
import {
  aiMerchantKey,
  isAiEligible,
  looksLikePersonName,
  merchantNameForAi,
  transactionNameForAi,
} from './aiCategorize';

describe('isAiEligible', () => {
  it('compra no cartão de crédito ou no débito vai', () => {
    expect(
      isAiEligible({
        descriptionRaw: 'Ebn *Tiktok',
        merchantName: 'Tiktok',
        accountType: 'credit_card',
      }),
    ).toBe(true);
    expect(
      isAiEligible({
        descriptionRaw: 'Compra no débito|HAYET LANCHES',
        merchantName: 'Hayet Lanches',
        accountType: 'checking',
      }),
    ).toBe(true);
  });

  it('Pix pra empresa vai; pra pessoa nunca', () => {
    const pix = (name: string) => ({
      descriptionRaw: `Transferência enviada pelo Pix|${name.toUpperCase()}`,
      merchantName: name,
      accountType: 'checking' as const,
    });
    expect(isAiEligible(pix('Qms Internacional Programacao Ltda'))).toBe(true);
    expect(isAiEligible(pix('Telefonica Brasil S.a.'))).toBe(true);
    expect(isAiEligible(pix('Beatriz Sanchez Zacalusni'))).toBe(false);
    expect(isAiEligible(pix('Mercadinho Simone'))).toBe(false);
  });
});

describe('looksLikePersonName', () => {
  it('pega nome de pessoa que vende na maquininha (dado real de 2026-10-12)', () => {
    for (const name of [
      'Arminda Claudete da Silva Ribeiro',
      '52 871 299 Bruno Henrique da Silva Ribeiro',
      'Rafaela Pendek ribeiro',
      'Nelson zacalusni Gonçalves junior',
      'Beatriz Sanchez Zacalusni',
      'Jefferson Henrique da',
    ]) {
      expect(looksLikePersonName(name), name).toBe(true);
    }
  });

  it('não confunde estabelecimento', () => {
    for (const name of [
      'Hayet Lanches',
      'Rest Meruza',
      'Cacau Show',
      'Havan Guarapuava',
      'Tiktok',
      'Lanches da Maria',
      'Casa dos Doces',
      'Casa do Sabor',
      'Telefonica Brasil S.a.',
      'IOF de compra internacional',
      'Juros de rotativo',
      'Doutores da Carne Aven',
    ]) {
      expect(looksLikePersonName(name), name).toBe(false);
    }
  });

  it('nome de pessoa no cartão não vai pra IA', () => {
    expect(
      isAiEligible({
        descriptionRaw: 'Arminda Claudete da Silva Ribeiro 1/2',
        merchantName: 'Arminda Claudete da Silva Ribeiro',
        accountType: 'credit_card',
      }),
    ).toBe(false);
  });
});

describe('merchantNameForAi', () => {
  it('tira CPF, CNPJ e códigos', () => {
    expect(merchantNameForAi('52 871 299 Bruno Henrique da Silva Ribeiro')).toBe(
      'Bruno Henrique da Silva Ribeiro',
    );
    expect(merchantNameForAi('58.704.466 Jefferson')).toBe('Jefferson');
    expect(merchantNameForAi('Ifd*47139681 Joao Carl')).toBe('Ifd* Joao Carl');
    expect(merchantNameForAi('Google G1ai101m')).toBe('Google G1ai101m');
    expect(merchantNameForAi('51478247Jean')).toBe('Jean');
  });

  it('sem nome que sobre, não manda', () => {
    expect(merchantNameForAi('51478247')).toBeNull();
    expect(merchantNameForAi('123.456.789-00')).toBeNull();
  });
});

describe('aiMerchantKey', () => {
  it('ignora maiúsculas e acentos', () => {
    expect(aiMerchantKey('Cacau Show')).toBe(aiMerchantKey('CACAU SHÓW'));
  });
});

describe('transactionNameForAi', () => {
  it('estabelecimento vai sem números; pessoa vira rótulo genérico', () => {
    expect(transactionNameForAi({ descriptionRaw: 'Ebn *Tiktok', merchantName: 'Tiktok' })).toBe(
      'Tiktok',
    );
    expect(
      transactionNameForAi({
        descriptionRaw: 'Ifd*47139681 Gelato Bom',
        merchantName: 'Ifd*47139681 Gelato Bom',
      }),
    ).toBe('Ifd* Gelato Bom');
    expect(
      transactionNameForAi({
        descriptionRaw: 'Transferência enviada pelo Pix|Mercadinho Simone',
        merchantName: 'Mercadinho Simone',
      }),
    ).toBe('Transferência para pessoa');
    expect(
      transactionNameForAi({
        descriptionRaw: 'Arminda Claudete da Silva Ribeiro 1/2',
        merchantName: 'Arminda Claudete da Silva Ribeiro',
      }),
    ).toBe('Compra com pessoa física');
    expect(
      transactionNameForAi({
        descriptionRaw: 'Transferência enviada pelo Pix|TELEFONICA BRASIL S.A.',
        merchantName: 'Telefonica Brasil S.a.',
      }),
    ).toBe('Telefonica Brasil S.a.');
  });
});
