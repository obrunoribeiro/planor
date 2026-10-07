// A API devolve só o nome da categoria (texto livre, CONTEXTO.md §7) — o ícone de cada uma é uma
// escolha de apresentação do app, não um dado do backend. Cobre as categorias globais do §6.3;
// qualquer categoria nova (ou criada pelo usuário) cai no ícone genérico "outros".
import type { IconName } from '@planor/ui';

const CATEGORY_ICON_BY_NAME: Record<string, IconName> = {
  Moradia: 'moradia',
  Mercado: 'mercado',
  Delivery: 'delivery',
  Transporte: 'transporte',
  Saúde: 'saude',
  Assinaturas: 'assinaturas',
  'Contas da casa': 'moradia',
};

export function categoryIcon(name: string): IconName {
  return CATEGORY_ICON_BY_NAME[name] ?? 'outros';
}
