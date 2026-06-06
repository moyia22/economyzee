import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PaymentMethod, Prisma, TransactionOrigin, TransactionType } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { SupabaseSafeService } from '../supabase/supabase-safe.service';
import {
  getBRTStartOfDay,
  getBRTStartOfWeek,
  getBRTStartOfMonth,
} from '../../common/utils/date.utils';
import { effectiveLinked } from '../cards/card-links.util';

type TransactionInput = {
  description: string;
  amountInCents: number;
  type: TransactionType | 'INCOME' | 'EXPENSE' | 'income' | 'expense';
  categoryId: string;
  accountId?: string | null;
  cardId?: string | null;
  memberId?: string;
  userId?: string;
  origin?: TransactionOrigin | keyof typeof TransactionOrigin;
  date?: Date | string;
  note?: string;
  confidence?: number;
  installments?: number;
  paymentMethod?: PaymentMethod | keyof typeof PaymentMethod | string | null;
};

const CARD_PAYMENT_METHODS: PaymentMethod[] = [
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.DEBIT_CARD,
];

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
    private supabaseSafe: SupabaseSafeService,
  ) {}

  async findAll(orgId: string, filters?: {
    search?: string; category?: string; account?: string;
    origin?: string; type?: string; page?: number; limit?: number;
  }) {
    const where: Prisma.TransactionWhereInput = { orgId, deletedAt: null };
    if (filters?.search) {
      where.description = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters?.category) where.categoryId = filters.category;
    if (filters?.account) {
      where.OR = [{ accountId: filters.account }, { cardId: filters.account }];
    }
    if (filters?.origin) where.origin = filters.origin as any;
    if (filters?.type) where.type = filters.type as any;

    const page = filters?.page || 1;
    const limit = filters?.limit || 60;

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where, orderBy: { date: 'desc' },
        skip: (page - 1) * limit, take: limit,
        include: {
          category: true,
          account: true,
          card: true,
          member: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(orgId: string, data: TransactionInput) {
    const transaction = await this.prisma.$transaction(async (tx) => {
      const member = await this.resolveMember(orgId, data, tx);
      const type = this.normalizeTransactionType(data.type);
      const payment = await this.resolvePayment(orgId, data, tx);
      const installments = Math.max(1, Number(data.installments || 1));
      const totalAmount = Number(data.amountInCents || 0);

      if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
        throw new BadRequestException('Valor da transacao deve ser maior que zero.');
      }

      const installmentAmount = Math.round(totalAmount / installments);
      const groupId = installments > 1 ? `inst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` : undefined;
      const txsToCreate: Prisma.TransactionCreateInput[] = [];
      const baseDate = data.date ? new Date(data.date) : new Date();

      for (let i = 0; i < installments; i++) {
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(installmentDate.getMonth() + i);

        const amount = i === installments - 1 && installments > 1
          ? totalAmount - installmentAmount * (installments - 1)
          : installmentAmount;

        txsToCreate.push({
          description: installments > 1
            ? `${data.description} (${i + 1}/${installments})`
            : data.description,
          amountInCents: amount,
          type,
          origin: (data.origin as TransactionOrigin) || TransactionOrigin.MANUAL,
          paymentMethod: payment.paymentMethod,
          category: { connect: { id: data.categoryId } },
          account: payment.accountId ? { connect: { id: payment.accountId } } : undefined,
          card: payment.cardId ? { connect: { id: payment.cardId } } : undefined,
          member: { connect: { id: member.id } },
          org: { connect: { id: orgId } },
          confidence: data.confidence,
          date: installmentDate,
          note: data.note,
          installments,
          currentInstallment: i + 1,
          installmentGroupId: groupId,
        });
      }

      const createdTxs = await Promise.all(
        txsToCreate.map((txData) =>
          tx.transaction.create({
            data: txData,
            include: { category: true, account: true, card: true, member: true },
          }),
        ),
      );

      await this.applyAccountEffects(createdTxs, 1, tx);

      if (payment.cardId && type === TransactionType.EXPENSE) {
        await this.updateCardUsage(payment.cardId, tx);
      }

      return createdTxs[0];
    });

    this.realtime.sendToUser(transaction.member.userId, 'transaction_created', transaction);

    return transaction;
  }

  private async resolveMember(orgId: string, data: TransactionInput, db: DbClient = this.prisma) {
    if (data.memberId) {
      const member = await db.organizationMember.findFirst({
        where: { id: data.memberId, orgId },
      });
      if (member) return member;
    }

    const userId = data.userId || data.memberId;
    if (userId) {
      const member = await db.organizationMember.findUnique({
        where: { userId_orgId: { userId, orgId } },
      });
      if (member) return member;
    }

    throw new BadRequestException('Usuario nao e membro deste workspace.');
  }

  private normalizeTransactionType(type: TransactionInput['type']): TransactionType {
    const normalized = String(type || '').toUpperCase();
    if (normalized === TransactionType.INCOME) return TransactionType.INCOME;
    if (normalized === TransactionType.EXPENSE) return TransactionType.EXPENSE;
    throw new BadRequestException('Tipo de transacao invalido.');
  }

  private async resolvePayment(orgId: string, data: TransactionInput, db: DbClient = this.prisma) {
    const cardId = data.cardId || undefined;
    const accountId = cardId ? undefined : data.accountId || undefined;

    const [card, account] = await Promise.all([
      cardId ? db.card.findFirst({ where: { id: cardId, orgId } }) : null,
      accountId ? db.account.findFirst({ where: { id: accountId, orgId } }) : null,
    ]);

    // Cartão do próprio workspace OU cartão pessoal vinculado a este workspace.
    let resolvedCard = card;
    if (cardId && !resolvedCard) {
      resolvedCard = await this.resolveLinkedPersonalCard(orgId, data.userId, cardId, db);
    }

    if (cardId && !resolvedCard) {
      throw new BadRequestException('Cartao nao encontrado neste workspace.');
    }

    if (accountId && !account) {
      throw new BadRequestException('Conta nao encontrada neste workspace.');
    }

    let paymentMethod = this.normalizePaymentMethod(data.paymentMethod);

    if (resolvedCard) {
      const inferred = resolvedCard.cardType === 'DEBIT'
        ? PaymentMethod.DEBIT_CARD
        : PaymentMethod.CREDIT_CARD;

      if (
        paymentMethod &&
        CARD_PAYMENT_METHODS.includes(paymentMethod) &&
        paymentMethod !== inferred
      ) {
        throw new BadRequestException(
          `Voce selecionou ${paymentMethod === PaymentMethod.CREDIT_CARD ? 'credito' : 'debito'}, mas o cartao e de ${resolvedCard.cardType === 'DEBIT' ? 'debito' : 'credito'}.`,
        );
      }

      paymentMethod = inferred;
    }

    if (!paymentMethod) {
      paymentMethod = this.inferPaymentMethod(data.description, data.note, !!accountId);
    }

    if (
      CARD_PAYMENT_METHODS.includes(paymentMethod) &&
      !cardId
    ) {
      throw new BadRequestException('Selecione um cartao para esta forma de pagamento.');
    }

    return {
      accountId,
      cardId,
      paymentMethod,
    };
  }

  /**
   * Retorna o cartão pessoal do usuário se ele estiver efetivamente vinculado
   * a este workspace; caso contrário, null.
   */
  private async resolveLinkedPersonalCard(orgId: string, userId: string | undefined, cardId: string, db: DbClient = this.prisma) {
    if (!userId) return null;

    const personalMembership = await db.organizationMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { orgId: true },
    });
    const personalOrgId = personalMembership?.orgId ?? null;
    if (!personalOrgId || personalOrgId === orgId) return null;

    const card = await db.card.findFirst({ where: { id: cardId, orgId: personalOrgId } });
    if (!card) return null;

    const link = await db.cardWorkspaceLink.findUnique({
      where: { userId_cardId_orgId: { userId, cardId, orgId } },
    });

    let autoLink = false;
    if (!link) {
      const pref = await db.workspaceCardPreference.findUnique({
        where: { userId_orgId: { userId, orgId } },
      });
      autoLink = pref?.autoLinkPersonalCards ?? false;
    }

    return effectiveLinked(link?.linked, autoLink) ? card : null;
  }

  private normalizePaymentMethod(value?: string | null): PaymentMethod | null {
    if (!value) return null;
    const normalized = String(value)
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\s-]+/g, '_');

    const aliases: Record<string, PaymentMethod> = {
      CONTA: PaymentMethod.ACCOUNT,
      ACCOUNT: PaymentMethod.ACCOUNT,
      CARTEIRA: PaymentMethod.ACCOUNT,
      WALLET: PaymentMethod.ACCOUNT,
      PIX: PaymentMethod.PIX,
      DINHEIRO: PaymentMethod.CASH,
      CASH: PaymentMethod.CASH,
      CREDITO: PaymentMethod.CREDIT_CARD,
      CREDIT: PaymentMethod.CREDIT_CARD,
      CREDIT_CARD: PaymentMethod.CREDIT_CARD,
      CARTAO_CREDITO: PaymentMethod.CREDIT_CARD,
      CARTAO_DE_CREDITO: PaymentMethod.CREDIT_CARD,
      DEBITO: PaymentMethod.DEBIT_CARD,
      DEBIT: PaymentMethod.DEBIT_CARD,
      DEBIT_CARD: PaymentMethod.DEBIT_CARD,
      CARTAO_DEBITO: PaymentMethod.DEBIT_CARD,
      CARTAO_DE_DEBITO: PaymentMethod.DEBIT_CARD,
      TRANSFERENCIA: PaymentMethod.BANK_TRANSFER,
      TRANSFERENCIA_BANCARIA: PaymentMethod.BANK_TRANSFER,
      TED: PaymentMethod.BANK_TRANSFER,
      DOC: PaymentMethod.BANK_TRANSFER,
      BOLETO: PaymentMethod.BOLETO,
      OUTRO: PaymentMethod.OTHER,
      OTHER: PaymentMethod.OTHER,
      UNKNOWN: PaymentMethod.OTHER,
    };

    return aliases[normalized] || (Object.values(PaymentMethod).includes(normalized as PaymentMethod) ? normalized as PaymentMethod : null);
  }

  private inferPaymentMethod(description?: string, note?: string, hasAccount?: boolean): PaymentMethod {
    const text = `${description || ''} ${note || ''}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (/\bpix\b/.test(text)) return PaymentMethod.PIX;
    if (/dinheiro|especie/.test(text)) return PaymentMethod.CASH;
    if (/boleto/.test(text)) return PaymentMethod.BOLETO;
    if (/transferencia|ted|doc/.test(text)) return PaymentMethod.BANK_TRANSFER;
    return hasAccount ? PaymentMethod.ACCOUNT : PaymentMethod.OTHER;
  }

  private async applyAccountEffects(
    transactions: Array<{ accountId: string | null; type: TransactionType; amountInCents: number }>,
    direction: 1 | -1,
    db: DbClient = this.prisma,
  ) {
    for (const transaction of transactions) {
      if (!transaction.accountId) continue;
      const signedAmount =
        transaction.type === TransactionType.INCOME
          ? transaction.amountInCents
          : -transaction.amountInCents;

      await db.account.update({
        where: { id: transaction.accountId },
        data: { balance: { increment: signedAmount * direction } },
      });
    }
  }

  /** Recalculate card usedInCents from all active transactions */
  async updateCardUsage(cardId: string, db?: DbClient) {
    const updateUsage = async (client: DbClient) => {
      const now = new Date();
      const result = await client.transaction.aggregate({
        where: {
          cardId,
          deletedAt: null,
          type: { in: ['EXPENSE'] as any },
          date: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
            lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
          },
        },
        _sum: { amountInCents: true },
      });
      await client.card.update({
        where: { id: cardId },
        data: { usedInCents: result._sum.amountInCents || 0 },
      });
    };

    if (db) {
      await updateUsage(db);
      return;
    }

    await this.prisma.$transaction((tx) => updateUsage(tx));
  }

  async update(id: string, orgId: string, data: Partial<TransactionInput> & { amount?: number }) {
    const transaction = await this.prisma.$transaction(async (tx) => {
      const previous = await tx.transaction.findFirst({
        where: { id, orgId },
        include: { member: true },
      });

      if (!previous) {
        throw new NotFoundException('Transacao nao encontrada.');
      }

      const type = data.type ? this.normalizeTransactionType(data.type) : previous.type;
      const amountInCents =
        typeof data.amountInCents === 'number'
          ? data.amountInCents
          : typeof data.amount === 'number'
            ? Math.round(data.amount * 100)
            : previous.amountInCents;

      const payment = await this.resolvePayment(previous.orgId, {
        description: data.description || previous.description,
        amountInCents,
        type,
        categoryId: data.categoryId || previous.categoryId,
        accountId: data.accountId !== undefined ? data.accountId : previous.accountId,
        cardId: data.cardId !== undefined ? data.cardId : previous.cardId,
        memberId: previous.memberId,
        userId: data.userId,
        paymentMethod: data.paymentMethod !== undefined ? data.paymentMethod : previous.paymentMethod,
        note: data.note !== undefined ? data.note || undefined : previous.note || undefined,
      }, tx);

      await this.applyAccountEffects([previous], -1, tx);

      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: {
          description: data.description,
          amountInCents,
          type,
          categoryId: data.categoryId,
          accountId: payment.accountId || null,
          cardId: payment.cardId || null,
          paymentMethod: payment.paymentMethod,
          note: data.note,
          date: data.date ? new Date(data.date) : undefined,
        },
        include: { category: true, account: true, card: true, member: true },
      });

      await this.applyAccountEffects([updatedTransaction], 1, tx);

      for (const cardId of Array.from(new Set([previous.cardId, updatedTransaction.cardId].filter(Boolean) as string[]))) {
        await this.updateCardUsage(cardId, tx);
      }

      return updatedTransaction;
    });

    this.realtime.sendToUser(transaction.member.userId, 'transaction_updated', transaction);
    return transaction;
  }

  async delete(id: string, orgId: string) {
    const transaction = await this.prisma.$transaction(async (tx) => {
      const previous = await tx.transaction.findFirst({ where: { id, orgId } });
      if (!previous) {
        throw new NotFoundException('Transacao nao encontrada.');
      }

      const deletedTransaction = await tx.transaction.update({
        where: { id: previous.id },
        data: { deletedAt: new Date() },
        include: { member: true }
      });

      if (previous && !previous.deletedAt) {
        await this.applyAccountEffects([previous], -1, tx);
        if (previous.cardId) await this.updateCardUsage(previous.cardId, tx);
      }

      return deletedTransaction;
    });

    this.realtime.sendToUser(transaction.member.userId, 'transaction_deleted', { id });
    return transaction;
  }

  findById(id: string, orgId: string) {
    return this.prisma.transaction.findFirst({
      where: { id, orgId },
      include: { category: true, account: true, card: true }
    });
  }

  findByOrg(orgId: string) {
    return this.prisma.transaction.findMany({
      where: { orgId, deletedAt: null }, orderBy: { date: 'desc' },
      include: { category: true, account: true, card: true, member: { include: { user: true } } },
    });
  }

  async getSummary(orgId: string, startDate: Date, endDate: Date) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        orgId,
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
      },
      include: { category: true },
    });

    const income = transactions
      .filter((t) => (t.type as any) === 'income' || t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amountInCents, 0);

    const expense = transactions
      .filter((t) => (t.type as any) === 'expense' || t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amountInCents, 0);

    const byCategory = transactions
      .filter((t) => (t.type as any) === 'expense' || t.type === TransactionType.EXPENSE)
      .reduce((acc, t) => {
        const catName = t.category?.name || 'Outros';
        acc[catName] = (acc[catName] || 0) + t.amountInCents;
        return acc;
      }, {} as Record<string, number>);

    return { income, expense, balance: income - expense, byCategory };
  }

  async getTrash(orgId: string) {
    return this.prisma.transaction.findMany({
      where: { orgId, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      include: { category: true, account: true, card: true },
    });
  }

  async restore(id: string, orgId: string) {
    const transaction = await this.prisma.$transaction(async (tx) => {
      const previous = await tx.transaction.findFirst({ where: { id, orgId } });
      if (!previous) {
        throw new NotFoundException('Transacao nao encontrada.');
      }

      const restoredTransaction = await tx.transaction.update({
        where: { id: previous.id },
        data: { deletedAt: null },
        include: { member: true }
      });
      if (previous?.deletedAt) {
        await this.applyAccountEffects([restoredTransaction], 1, tx);
        if (restoredTransaction.cardId) await this.updateCardUsage(restoredTransaction.cardId, tx);
      }

      return restoredTransaction;
    });

    this.realtime.sendToUser(transaction.member.userId, 'transaction_updated', transaction);
    return transaction;
  }

  async restoreAll(orgId: string) {
    return this.prisma.$transaction(async (tx) => {
      const transactions = await tx.transaction.findMany({
        where: { orgId, deletedAt: { not: null } },
        select: { accountId: true, type: true, amountInCents: true, cardId: true },
      });
      const result = await tx.transaction.updateMany({
        where: { orgId, deletedAt: { not: null } },
        data: { deletedAt: null },
      });
      await this.applyAccountEffects(transactions, 1, tx);
      for (const cardId of Array.from(new Set(transactions.map((t) => t.cardId).filter(Boolean) as string[]))) {
        await this.updateCardUsage(cardId, tx);
      }
      return { count: result.count };
    });
  }

  async deletePermanent(id: string, orgId: string, userId: string) {
    const transaction = await this.prisma.$transaction(async (tx) => {
      const previous = await tx.transaction.findFirst({ where: { id, orgId } });
      if (!previous) {
        throw new NotFoundException('Transacao nao encontrada.');
      }

      const deletedTransaction = await tx.transaction.delete({
        where: { id: previous.id },
        include: { member: true }
      });

      await tx.auditLog.create({
        data: {
          action: 'PERMANENT_DELETE',
          entity: 'Transaction',
          entityId: id,
          userId,
          orgId: deletedTransaction.orgId,
        }
      });

      return deletedTransaction;
    });

    this.realtime.sendToUser(transaction.member.userId, 'transaction_deleted', { id, permanent: true });
    return transaction;
  }

  async resetTransactions(orgId: string, userId: string, period: 'day' | 'week' | 'month' | 'all') {
    // Datas calculadas no fuso de Brasília (BRT) e convertidas para UTC,
    // para que o reset corresponda ao "dia/semana/mês" como o usuário vê no app
    // independentemente do timezone do servidor (UTC em produção).
    let dateFilter: { gte: Date } | undefined;

    if (period === 'day') {
      dateFilter = { gte: getBRTStartOfDay() };
    } else if (period === 'week') {
      dateFilter = { gte: getBRTStartOfWeek() };
    } else if (period === 'month') {
      dateFilter = { gte: getBRTStartOfMonth() };
    }
    // period === 'all' → dateFilter undefined (reseta tudo)

    const where: Prisma.TransactionWhereInput = {
      orgId,
      deletedAt: null,
      ...(dateFilter ? { date: dateFilter } : {}),
    };

    this.logger.log(
      `[Reset] solicitado: orgId=${orgId} userId=${userId} period=${period} ` +
      `cutoff=${dateFilter ? dateFilter.gte.toISOString() : 'TODOS'}`
    );

    // Captura IDs de cartões afetados ANTES do soft-delete para recalcular usedInCents
    const resetResult = await this.prisma.$transaction(async (tx) => {
    const affected = await tx.transaction.findMany({
      where,
      select: { id: true, cardId: true, accountId: true, type: true, amountInCents: true },
    });
    const count = affected.length;

    if (count === 0) {
      this.logger.log(`[Reset] Nenhuma transação para resetar (orgId=${orgId}, period=${period})`);
      return { success: true, count: 0, period };
    }

    const result = await tx.transaction.updateMany({
      where,
      data: { deletedAt: new Date() },
    });

    await this.applyAccountEffects(affected, -1, tx);

    this.logger.log(
      `[Reset] ${result.count} transações movidas para a lixeira (orgId=${orgId}, period=${period})`
    );

    // Recalcula o usedInCents de cada cartão impactado (despesas removidas liberam limite)
    const affectedCardIds = Array.from(
      new Set(affected.map(t => t.cardId).filter((id): id is string => !!id))
    );
    for (const cardId of affectedCardIds) {
      try {
        await this.updateCardUsage(cardId, tx);
      } catch (err: any) {
        this.logger.warn(`[Reset] Falha ao recalcular cartão ${cardId}: ${err.message}`);
        throw err;
      }
    }
    if (affectedCardIds.length > 0) {
      this.logger.log(`[Reset] Recalculado usedInCents de ${affectedCardIds.length} cartão(ões)`);
    }

    await tx.auditLog.create({
      data: {
        action: `RESET_${period.toUpperCase()}`,
        entity: 'Transaction',
        metadata: { count, period, cutoff: dateFilter?.gte?.toISOString() || null },
        userId,
        orgId,
      },
    });

      return { success: true, count, period };
    });

    // Notifica o frontend (websocket) para invalidar dashboard
    if (resetResult.count > 0) {
      try {
        this.realtime.sendToUser(userId, 'transactions_reset', { period, count: resetResult.count });
      } catch {
        /* ignore broadcast errors */
      }
    }

    return resetResult;
  }
}
