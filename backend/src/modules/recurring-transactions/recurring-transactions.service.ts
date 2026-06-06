import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PaymentMethod, Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

type DbClient = PrismaService | Prisma.TransactionClient;

const ALLOWED_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
type Frequency = (typeof ALLOWED_FREQUENCIES)[number];

export type RecurringTransactionInput = {
  description?: string;
  amountInCents?: number;
  type?: TransactionType | string;
  categoryId?: string;
  accountId?: string | null;
  cardId?: string | null;
  frequency?: string;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  nextOccurrence?: Date | string;
  startDate?: Date | string;
  active?: boolean;
};

const RECURRING_INCLUDE = {
  category: true,
  account: true,
  card: true,
} satisfies Prisma.RecurringTransactionInclude;

@Injectable()
export class RecurringTransactionsService {
  private readonly logger = new Logger(RecurringTransactionsService.name);

  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  findAll(orgId: string) {
    return this.prisma.recurringTransaction.findMany({
      where: { orgId },
      orderBy: { nextOccurrence: 'asc' },
      include: RECURRING_INCLUDE,
    });
  }

  async create(orgId: string, userId: string, data: RecurringTransactionInput) {
    const result = await this.prisma.$transaction(async (tx) => {
      const member = await this.resolveMember(orgId, userId, tx);

      const description = this.requireDescription(data.description);
      const amountInCents = this.requireAmount(data.amountInCents);
      const type = this.normalizeType(data.type);
      const frequency = this.normalizeFrequency(data.frequency);
      const nextOccurrence = this.requireNextOccurrence(data.nextOccurrence ?? data.startDate);

      await this.requireCategoryInOrg(orgId, this.requireCategoryId(data.categoryId), tx);
      const payment = await this.resolvePayment(orgId, data.accountId, data.cardId, type, tx);

      const created = await tx.recurringTransaction.create({
        data: {
          description,
          amountInCents,
          type,
          paymentMethod: payment.paymentMethod,
          frequency,
          dayOfMonth: data.dayOfMonth ?? null,
          dayOfWeek: data.dayOfWeek ?? null,
          nextOccurrence,
          active: data.active ?? true,
          categoryId: data.categoryId!,
          accountId: payment.accountId,
          cardId: payment.cardId,
          memberId: member.id,
          orgId,
        },
        include: RECURRING_INCLUDE,
      });

      await this.writeAudit(tx, 'RECURRING_TRANSACTION_CREATED', created.id, userId, orgId);

      return created;
    });

    this.emit(userId, 'recurring_transaction_created', result);
    return result;
  }

  async update(id: string, orgId: string, userId: string, data: RecurringTransactionInput) {
    const result = await this.prisma.$transaction(async (tx) => {
      const previous = await this.requireRecurringInOrg(id, orgId, tx);

      if (data.categoryId && data.categoryId !== previous.categoryId) {
        await this.requireCategoryInOrg(orgId, data.categoryId, tx);
      }

      const type = data.type !== undefined ? this.normalizeType(data.type) : previous.type;

      // Resolve conta/cartão somente quando algum dos dois é informado.
      const accountTouched = data.accountId !== undefined;
      const cardTouched = data.cardId !== undefined;
      let paymentUpdate: { accountId: string | null; cardId: string | null; paymentMethod: PaymentMethod | null } | null = null;
      if (accountTouched || cardTouched) {
        paymentUpdate = await this.resolvePayment(
          orgId,
          accountTouched ? data.accountId : previous.accountId,
          cardTouched ? data.cardId : previous.cardId,
          type,
          tx,
        );
      }

      const updateData: Prisma.RecurringTransactionUpdateInput = {};
      if (data.description !== undefined) updateData.description = this.requireDescription(data.description);
      if (data.amountInCents !== undefined) updateData.amountInCents = this.requireAmount(data.amountInCents);
      if (data.type !== undefined) updateData.type = type;
      if (data.frequency !== undefined) updateData.frequency = this.normalizeFrequency(data.frequency);
      if (data.dayOfMonth !== undefined) updateData.dayOfMonth = data.dayOfMonth;
      if (data.dayOfWeek !== undefined) updateData.dayOfWeek = data.dayOfWeek;
      if (data.active !== undefined) updateData.active = data.active;
      const nextOccurrenceRaw = data.nextOccurrence ?? data.startDate;
      if (nextOccurrenceRaw !== undefined) updateData.nextOccurrence = this.requireNextOccurrence(nextOccurrenceRaw);
      if (data.categoryId !== undefined) updateData.category = { connect: { id: data.categoryId } };
      if (paymentUpdate) {
        updateData.account = paymentUpdate.accountId ? { connect: { id: paymentUpdate.accountId } } : { disconnect: true };
        updateData.card = paymentUpdate.cardId ? { connect: { id: paymentUpdate.cardId } } : { disconnect: true };
        updateData.paymentMethod = paymentUpdate.paymentMethod;
      }

      const updated = await tx.recurringTransaction.update({
        where: { id },
        data: updateData,
        include: RECURRING_INCLUDE,
      });

      await this.writeAudit(tx, 'RECURRING_TRANSACTION_UPDATED', id, userId, orgId);

      return updated;
    });

    this.emit(userId, 'recurring_transaction_updated', result);
    return result;
  }

  async delete(id: string, orgId: string, userId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      await this.requireRecurringInOrg(id, orgId, tx);
      const deleted = await tx.recurringTransaction.delete({ where: { id } });
      await this.writeAudit(tx, 'RECURRING_TRANSACTION_DELETED', id, userId, orgId);
      return deleted;
    });

    this.emit(userId, 'recurring_transaction_deleted', { id, orgId });
    return { success: true, id };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async resolveMember(orgId: string, userId: string, db: DbClient) {
    const member = await db.organizationMember.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!member) {
      throw new BadRequestException('Usuario nao e membro deste workspace.');
    }
    return member;
  }

  private async requireRecurringInOrg(id: string, orgId: string, db: DbClient) {
    const recurring = await db.recurringTransaction.findFirst({ where: { id, orgId } });
    if (!recurring) {
      throw new NotFoundException('Recorrencia nao encontrada.');
    }
    return recurring;
  }

  private async requireCategoryInOrg(orgId: string, categoryId: string, db: DbClient) {
    const category = await db.category.findFirst({ where: { id: categoryId, orgId } });
    if (!category) {
      throw new BadRequestException('Categoria nao encontrada neste workspace.');
    }
    return category;
  }

  /**
   * Valida conta/cartão no workspace e garante que exista exatamente uma fonte
   * (conta OU cartão) — o processor exige uma delas para aplicar os efeitos.
   */
  private async resolvePayment(
    orgId: string,
    accountIdRaw: string | null | undefined,
    cardIdRaw: string | null | undefined,
    type: TransactionType,
    db: DbClient,
  ): Promise<{ accountId: string | null; cardId: string | null; paymentMethod: PaymentMethod | null }> {
    const cardId = cardIdRaw || null;
    const accountId = cardId ? null : accountIdRaw || null;

    if (!accountId && !cardId) {
      throw new BadRequestException('Informe uma conta ou um cartao para a recorrencia.');
    }

    if (cardId) {
      const card = await db.card.findFirst({ where: { id: cardId, orgId } });
      if (!card) {
        throw new BadRequestException('Cartao nao encontrado neste workspace.');
      }
      const paymentMethod = card.cardType === 'DEBIT' ? PaymentMethod.DEBIT_CARD : PaymentMethod.CREDIT_CARD;
      return { accountId: null, cardId, paymentMethod };
    }

    const account = await db.account.findFirst({ where: { id: accountId!, orgId } });
    if (!account) {
      throw new BadRequestException('Conta nao encontrada neste workspace.');
    }
    return { accountId, cardId: null, paymentMethod: PaymentMethod.ACCOUNT };
  }

  private requireDescription(value?: string) {
    const description = String(value ?? '').trim();
    if (!description) {
      throw new BadRequestException('Descricao da recorrencia e obrigatoria.');
    }
    return description;
  }

  private requireAmount(value?: number) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Valor da recorrencia deve ser maior que zero.');
    }
    return Math.round(amount);
  }

  private requireCategoryId(value?: string) {
    if (!value) {
      throw new BadRequestException('Categoria e obrigatoria.');
    }
    return value;
  }

  private normalizeType(value?: TransactionType | string): TransactionType {
    const normalized = String(value ?? '').toUpperCase();
    if (normalized === TransactionType.INCOME) return TransactionType.INCOME;
    if (normalized === TransactionType.EXPENSE) return TransactionType.EXPENSE;
    throw new BadRequestException('Tipo de transacao invalido.');
  }

  private normalizeFrequency(value?: string): Frequency {
    const normalized = String(value ?? 'MONTHLY').toUpperCase();
    if ((ALLOWED_FREQUENCIES as readonly string[]).includes(normalized)) {
      return normalized as Frequency;
    }
    throw new BadRequestException('Frequencia invalida. Use DAILY, WEEKLY, MONTHLY ou YEARLY.');
  }

  private requireNextOccurrence(value?: Date | string): Date {
    if (value === undefined || value === null || value === '') {
      throw new BadRequestException('Data da proxima ocorrencia e obrigatoria.');
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Data da proxima ocorrencia invalida.');
    }
    return date;
  }

  private async writeAudit(
    db: DbClient,
    action: string,
    entityId: string,
    userId: string,
    orgId: string,
  ) {
    await db.auditLog.create({
      data: {
        action,
        entity: 'RecurringTransaction',
        entityId,
        userId,
        orgId,
      },
    });
  }

  private emit(userId: string, event: string, payload: any) {
    try {
      this.realtime.sendToUser(userId, event, payload);
    } catch (error: any) {
      this.logger.error(`Recurring realtime emit failed: ${error.message}`);
    }
  }
}
