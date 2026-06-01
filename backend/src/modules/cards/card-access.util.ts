/**
 * Política de autorização para ESCRITA (criar/editar/excluir) de um cartão.
 *
 * Decisões puras, sem I/O, para serem testáveis isoladamente. O chamador traduz
 * a decisão em exceção HTTP.
 *
 * Regras (prioridade: segurança e integridade financeira):
 * - VIEWER (somente leitura) nunca escreve cartões -> 403.
 * - Editar/excluir só dentro da PRÓPRIA org ativa do usuário. Como o auth guard
 *   garante que `activeOrgId` é sempre uma org da qual o usuário é membro, exigir
 *   `card.orgId === activeOrgId` valida a associação.
 * - Cartão inexistente OU de outra org (inclui cartão pessoal vinculado, cujo
 *   `orgId` é o org pessoal, não o workspace) -> 404 genérico, sem vazar a
 *   existência de cartões de outra org.
 */

/** Mensagem única para 403 de escrita de cartão — mantém respostas consistentes. */
export const CARD_WRITE_FORBIDDEN_MESSAGE = 'Você não tem permissão para alterar cartões.';

/** Roles sem permissão de escrita em cartões. */
const WRITE_FORBIDDEN_ROLES = ['VIEWER'];

/**
 * Regra CENTRAL de escrita por role — usada tanto na criação quanto na
 * edição/exclusão, para evitar divergência de política entre os fluxos.
 * Role indefinido (ex.: chamadas internas/sistema) é permitido; a membership já
 * é garantida pelo auth guard nas rotas HTTP.
 */
export function canWriteCards(role: string | undefined): boolean {
  return !(role !== undefined && WRITE_FORBIDDEN_ROLES.includes(role));
}

export type CardWriteDecision = 'ALLOW' | 'FORBIDDEN_ROLE' | 'NOT_FOUND';

/** Decisão para escrita ligada a um recurso (editar/excluir um cartão existente). */
export function decideCardWrite(
  card: { orgId: string } | null | undefined,
  activeOrgId: string,
  role: string | undefined,
): CardWriteDecision {
  if (!canWriteCards(role)) return 'FORBIDDEN_ROLE';
  if (!card || card.orgId !== activeOrgId) return 'NOT_FOUND';
  return 'ALLOW';
}
