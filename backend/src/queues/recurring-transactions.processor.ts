import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { addDays, addMonths, addWeeks } from 'date-fns';

@Processor('recurring-transactions')
export class RecurringTransactionsProcessor {
  private readonly logger = new Logger(RecurringTransactionsProcessor.name);

  constructor(private prisma: PrismaService) {}

  @Process('process-daily')
  async processRecurring(job: Job) {
    this.logger.log('Processing recurring transactions...');
    const now = new Date();

    const recurring = await this.prisma.recurringTransaction.findMany({
      where: {
        active: true,
        nextOccurrence: { lte: now }
      },
      include: {
        category: true,
        account: true
      }
    });

    for (const rt of recurring) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // 1. Criar transação
          await tx.transaction.create({
            data: {
              description: rt.description,
              amountInCents: rt.amountInCents,
              type: rt.type,
              categoryId: rt.categoryId,
              accountId: rt.accountId,
              memberId: rt.memberId,
              orgId: rt.orgId,
              date: rt.nextOccurrence!,
              origin: 'RECURRING',
              status: 'CONFIRMED'
            }
          });

          // 2. Calcular próxima data
          let nextDate: Date;
          switch (rt.frequency) {
            case 'DAILY': nextDate = addDays(rt.nextOccurrence!, 1); break;
            case 'WEEKLY': nextDate = addWeeks(rt.nextOccurrence!, 1); break;
            case 'MONTHLY': nextDate = addMonths(rt.nextOccurrence!, 1); break;
            case 'YEARLY': nextDate = addMonths(rt.nextOccurrence!, 12); break;
            default: nextDate = addMonths(rt.nextOccurrence!, 1);
          }

          // 3. Atualizar recorrente
          await tx.recurringTransaction.update({
            where: { id: rt.id },
            data: {
              lastOccurrence: rt.nextOccurrence,
              nextOccurrence: nextDate
            }
          });
        });
        this.logger.log(`Processed recurring tx: ${rt.description}`);
      } catch (e: any) {
        this.logger.error(`Failed to process recurring tx ${rt.id}: ${e.message}`);
      }
    }

    return { processed: recurring.length };
  }
}
