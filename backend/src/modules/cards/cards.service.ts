import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { getPersonalOrgId, resolveLinkedCardIds } from './card-links.util';
import { CARD_WRITE_FORBIDDEN_MESSAGE, canWriteCards, decideCardWrite } from './card-access.util';

@Injectable()
export class CardsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, userId: string) {
    const ownCards = await this.prisma.card.findMany({ where: { orgId } });

    // Em workspace (org != pessoal), anexa os cartões pessoais efetivamente vinculados.
    const linkedCards: any[] = [];
    const personalOrgId = await getPersonalOrgId(this.prisma, userId);
    if (personalOrgId && orgId !== personalOrgId) {
      const personalCards = await this.prisma.card.findMany({ where: { orgId: personalOrgId } });
      const [links, pref] = await Promise.all([
        this.prisma.cardWorkspaceLink.findMany({ where: { userId, orgId } }),
        this.prisma.workspaceCardPreference.findUnique({
          where: { userId_orgId: { userId, orgId } },
        }),
      ]);
      const linkedIds = resolveLinkedCardIds(
        personalCards.map((c) => c.id),
        links.map((l) => ({ cardId: l.cardId, linked: l.linked })),
        pref?.autoLinkPersonalCards ?? false,
      );
      for (const c of personalCards) {
        if (linkedIds.has(c.id)) {
          linkedCards.push({ ...c, isLinkedPersonal: true, sourceOrgId: personalOrgId });
        }
      }
    }

    const cards = [...ownCards, ...linkedCards];

    // Calcula uso real a partir das transações do mês corrente.
    // A agregação é por cardId SEM filtrar org -> limite/fatura ficam unificados.
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const enriched = await Promise.all(cards.map(async (card) => {
      const usage = await this.prisma.transaction.aggregate({
        where: {
          cardId: card.id,
          deletedAt: null,
          type: 'EXPENSE',
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amountInCents: true },
      });

      return {
        ...card,
        usedInCents: usage._sum.amountInCents || 0,
        invoiceInCents: usage._sum.amountInCents || 0,
      };
    }));

    return enriched;
  }

  findById(id: string) {
    return this.prisma.card.findUnique({ where: { id } });
  }

  create(orgId: string, data: {
    name: string; brand?: any; last4: string;
    limitInCents?: number | null; color?: string; cardType?: string;
  }, role?: string) {
    this.assertCanWriteCards(role);

    return this.prisma.card.create({
      data: {
        ...data,
        limitInCents: Math.max(0, Number(data.limitInCents || 0)),
        orgId,
        cardType: (data.cardType as any) || 'CREDIT',
      },
    });
  }

  /** Barra roles somente-leitura (VIEWER) de QUALQUER escrita de cartão. */
  private assertCanWriteCards(role?: string) {
    if (!canWriteCards(role)) {
      throw new ForbiddenException(CARD_WRITE_FORBIDDEN_MESSAGE);
    }
  }

  /**
   * Autoriza editar/excluir um cartão. Garante que o cartão pertence à org ativa
   * (membership já garantida pelo auth guard) e que o role pode escrever.
   * Cartão de outra org (inclui cartão pessoal vinculado a um workspace) retorna
   * 404 genérico, sem vazar a existência de cartões de outra org.
   */
  private async authorizeCardWrite(id: string, orgId: string, role?: string) {
    const card = await this.prisma.card.findUnique({ where: { id } });
    const decision = decideCardWrite(card, orgId, role);

    if (decision === 'FORBIDDEN_ROLE') {
      throw new ForbiddenException(CARD_WRITE_FORBIDDEN_MESSAGE);
    }
    if (decision === 'NOT_FOUND') {
      throw new NotFoundException('Cartão não encontrado.');
    }

    return card!;
  }

  async update(
    id: string,
    data: { name?: string; limitInCents?: number | null; color?: string },
    orgId: string,
    role?: string,
  ) {
    await this.authorizeCardWrite(id, orgId, role);

    const updateData: any = {
      ...data,
    };

    delete updateData.limitInCents;
    if (data.limitInCents !== undefined) {
      updateData.limitInCents = Math.max(0, Number(data.limitInCents || 0));
    }

    return this.prisma.card.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string, orgId: string, role?: string) {
    await this.authorizeCardWrite(id, orgId, role);
    return this.prisma.card.delete({ where: { id } });
  }

  async getInvoices(cardId: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: { cardId, deletedAt: null },
      orderBy: { date: 'desc' },
      include: { category: true },
    });
    return transactions;
  }

  async getLinkState(orgId: string, userId: string) {
    const personalOrgId = await getPersonalOrgId(this.prisma, userId);
    if (!personalOrgId || orgId === personalOrgId) {
      return { isPersonalContext: true, autoLink: false, cards: [] as any[] };
    }

    const personalCards = await this.prisma.card.findMany({
      where: { orgId: personalOrgId },
      orderBy: { createdAt: 'asc' },
    });
    const [links, pref] = await Promise.all([
      this.prisma.cardWorkspaceLink.findMany({ where: { userId, orgId } }),
      this.prisma.workspaceCardPreference.findUnique({
        where: { userId_orgId: { userId, orgId } },
      }),
    ]);
    const autoLink = pref?.autoLinkPersonalCards ?? false;
    const linkedIds = resolveLinkedCardIds(
      personalCards.map((c) => c.id),
      links.map((l) => ({ cardId: l.cardId, linked: l.linked })),
      autoLink,
    );

    return {
      isPersonalContext: false,
      autoLink,
      cards: personalCards.map((c) => ({
        id: c.id,
        name: c.name,
        last4: c.last4,
        brand: c.brand,
        color: c.color,
        linked: linkedIds.has(c.id),
      })),
    };
  }

  async setAutoLink(orgId: string, userId: string, enabled: boolean) {
    const personalOrgId = await getPersonalOrgId(this.prisma, userId);
    if (!personalOrgId || orgId === personalOrgId) {
      throw new BadRequestException('O contexto pessoal não suporta vínculo de cartões.');
    }

    // Liga/desliga o auto-vínculo e LIMPA os overrides individuais (estado limpo).
    await this.prisma.$transaction([
      this.prisma.workspaceCardPreference.upsert({
        where: { userId_orgId: { userId, orgId } },
        create: { userId, orgId, autoLinkPersonalCards: enabled },
        update: { autoLinkPersonalCards: enabled },
      }),
      this.prisma.cardWorkspaceLink.deleteMany({ where: { userId, orgId } }),
    ]);

    return this.getLinkState(orgId, userId);
  }

  async setCardLink(orgId: string, userId: string, cardId: string, linked: boolean) {
    const personalOrgId = await getPersonalOrgId(this.prisma, userId);
    if (!personalOrgId || orgId === personalOrgId) {
      throw new BadRequestException('O contexto pessoal não suporta vínculo de cartões.');
    }

    const card = await this.prisma.card.findFirst({ where: { id: cardId, orgId: personalOrgId } });
    if (!card) {
      throw new BadRequestException('Cartão pessoal não encontrado.');
    }

    await this.prisma.cardWorkspaceLink.upsert({
      where: { userId_cardId_orgId: { userId, cardId, orgId } },
      create: { userId, cardId, orgId, linked },
      update: { linked },
    });

    return this.getLinkState(orgId, userId);
  }
}
