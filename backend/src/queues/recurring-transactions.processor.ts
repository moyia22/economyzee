import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import {
  PaymentMethod,
  Prisma,
  TransactionOrigin,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { addDays, addMonths, addWeeks } from 'date-fns';
import { PrismaService } from '../database/prisma.service';
import { RealtimeGateway } from '../modules/realtime/realtime.gateway';

type DueRecurringTransaction = Prisma.RecurringTransactionGetPayload<{
  include: {
    member: { select: { userId: true } };
  };
}>;

type ProcessedRecurringTransaction = {
  transaction: Prisma.TransactionGetPayload<{
    include: { category: true; account: true; card: true; member: true };
  }>;
  userId: string;
};

@Processor('recurring-transactions')
export class RecurringTransactionsProcessor {
  private readonly logger = new Logger(RecurringTransactionsProcessor.name);

  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  @Process('process-daily')
  async processRecurring(job?: Job<{ now?: string | Date }>) {
    const now = job?.data?.now ? new Date(job.data.now) : new Date();
    this.logger.log(`Processing recurring transactions due until ${now.toISOString()}...`);

    const recurring = await this.prisma.recurringTransaction.findMany({
      where: {
        active: true,
        nextOccurrence: { lte: now },
      },
      include: {
        member: { select: { userId: true } },
      },
    });

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (const rt of recurring) {
      try {
        const result = await this.processOne(rt, now);
        if (!result) {
          skipped += 1;
          continue;
        }

        succeeded += 1;
        this.emitRealtime(result);
        this.logger.log(`Processed recurring transaction ${rt.id}: ${rt.description}`);
      } catch (error: any) {
        failed += 1;
        this.logger.error(`Failed to process recurring transaction ${rt.id}: ${error.message}`);
      }
    }

    return { processed: recurring.length, succeeded, failed, skipped };
  }

  private async processOne(rt: DueRecurringTransaction, now: Date) {
    const dueAt = new Date(rt.nextOccurrence);
    const nextOccurrence = this.getNextOccurrence(dueAt, rt.frequency);
    const accountId = rt.cardId ? null : rt.accountId;
    const cardId = rt.cardId ?? null;

    if (!accountId && !cardId) {
      throw new Error(`Recurring transaction ${rt.id} has no account or card.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.recurringTransaction.updateMany({
        where: {
          id: rt.id,
          active: true,
          nextOccurrence: rt.nextOccurrence,
        },
        data: {
          lastOccurrence: dueAt,
          nextOccurrence,
        },
      });

      if (claim.count === 0) {
        return null;
      }

      const transaction = await tx.transaction.create({
        data: {
          description: rt.description,
          amountInCents: rt.amountInCents,
          type: rt.type,
          origin: TransactionOrigin.RECURRING,
          paymentMethod: this.resolvePaymentMethod(rt.paymentMethod, accountId, cardId),
          status: TransactionStatus.CONFIRMED,
          date: dueAt,
          categoryId: rt.categoryId,
          accountId,
          cardId,
          memberId: rt.memberId,
          orgId: rt.orgId,
        },
        include: { category: true, account: true, card: true, member: true },
      });

      if (accountId) {
        await this.applyAccountEffect(tx, accountId, rt.type, rt.amountInCents);
      }

      if (cardId && rt.type === TransactionType.EXPENSE) {
        await this.updateCardUsage(tx, cardId, now);
      }

      await tx.auditLog.create({
        data: {
          action: 'RECURRING_TRANSACTION_PROCESSED',
          entity: 'RecurringTransaction',
          entityId: rt.id,
          userId: rt.member.userId,
          orgId: rt.orgId,
          metadata: {
            transactionId: transaction.id,
            dueAt: dueAt.toISOString(),
            nextOccurrence: nextOccurrence.toISOString(),
          },
        },
      });

      return { transaction, userId: rt.member.userId };
    });
  }

  private resolvePaymentMethod(
    paymentMethod: PaymentMethod | null,
    accountId: string | null,
    cardId: string | null,
  ) {
    if (paymentMethod) return paymentMethod;
    if (cardId) return PaymentMethod.CREDIT_CARD;
    if (accountId) return PaymentMethod.ACCOUNT;
    return null;
  }

  private async applyAccountEffect(
    tx: Prisma.TransactionClient,
    accountId: string,
    type: TransactionType,
    amountInCents: number,
  ) {
    const signedAmount = type === TransactionType.INCOME ? amountInCents : -amountInCents;

    await tx.account.update({
      where: { id: accountId },
      data: { balance: { increment: signedAmount } },
    });
  }

  private async updateCardUsage(tx: Prisma.TransactionClient, cardId: string, now: Date) {
    const result = await tx.transaction.aggregate({
      where: {
        cardId,
        deletedAt: null,
        type: TransactionType.EXPENSE,
        date: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
          lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
        },
      },
      _sum: { amountInCents: true },
    });

    await tx.card.update({
      where: { id: cardId },
      data: { usedInCents: result._sum.amountInCents || 0 },
    });
  }

  private getNextOccurrence(current: Date, frequency: string) {
    switch (frequency) {
      case 'DAILY':
        return addDays(current, 1);
      case 'WEEKLY':
        return addWeeks(current, 1);
      case 'MONTHLY':
        return addMonths(current, 1);
      case 'YEARLY':
        return addMonths(current, 12);
      default:
        return addMonths(current, 1);
    }
  }

  private emitRealtime(result: ProcessedRecurringTransaction) {
    try {
      this.realtime.sendToUser(result.userId, 'transaction_created', result.transaction);
    } catch (error: any) {
      this.logger.error(`Recurring transaction realtime emit failed: ${error.message}`);
    }
  }
}
