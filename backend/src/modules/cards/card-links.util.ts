import type { PrismaService } from '../../database/prisma.service';

export interface CardLinkRow {
  cardId: string;
  linked: boolean;
}

/**
 * Vínculo efetivo de UM cartão: o override explícito (se houver) vence;
 * caso contrário, segue o flag de auto-vínculo do workspace.
 */
export function effectiveLinked(override: boolean | undefined, autoLink: boolean): boolean {
  return override === undefined ? autoLink : override;
}

/**
 * Dado o conjunto de cartões pessoais, as linhas de override de um workspace e o
 * flag de auto-vínculo, retorna o conjunto de cardIds efetivamente vinculados.
 * Overrides de cartões que não pertencem ao conjunto pessoal são ignorados.
 */
export function resolveLinkedCardIds(
  personalCardIds: string[],
  links: CardLinkRow[],
  autoLink: boolean,
): Set<string> {
  const overrides = new Map(links.map((l) => [l.cardId, l.linked]));
  const result = new Set<string>();
  for (const cardId of personalCardIds) {
    if (effectiveLinked(overrides.get(cardId), autoLink)) {
      result.add(cardId);
    }
  }
  return result;
}

/**
 * Org pessoal do usuário = org da associação mais antiga (criada no signup).
 * NÃO depende de Organization.type, que não distingue o pessoal dos demais.
 */
export async function getPersonalOrgId(
  prisma: PrismaService,
  userId: string,
): Promise<string | null> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { orgId: true },
  });
  return membership?.orgId ?? null;
}
