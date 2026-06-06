import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bull';

@Injectable()
export class RecurringTransactionsScheduler implements OnModuleInit {
  private readonly logger = new Logger(RecurringTransactionsScheduler.name);

  constructor(@InjectQueue('recurring-transactions') private readonly queue: Queue) {}

  async onModuleInit() {
    await this.queue.add(
      'process-daily',
      {},
      {
        jobId: 'recurring-transactions-process-daily',
        repeat: { cron: '0 * * * *' },
        removeOnComplete: 100,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
      },
    );

    this.logger.log('Recurring transactions scheduler registered.');
  }
}
