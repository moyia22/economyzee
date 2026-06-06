import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TelegramProcessor } from './telegram.processor';
import { AIProcessor } from './ai.processor';
import { BudgetCheckProcessor } from './budget-check.processor';
import { RecurringTransactionsProcessor } from './recurring-transactions.processor';
import { RecurringTransactionsScheduler } from './recurring-transactions.scheduler';
import { AIModule } from '../modules/ai/ai.module';
import { TransactionsModule } from '../modules/transactions/transactions.module';
import { CategoriesModule } from '../modules/categories/categories.module';
import { TelegramModule } from '../modules/telegram/telegram.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'telegram-message-processing' },
      { name: 'ai-processing' },
      { name: 'attachment-processing' },
      { name: 'reminders' },
      { name: 'budget-check' },
      { name: 'recurring-transactions' },
    ),
    AIModule,
    TransactionsModule,
    CategoriesModule,
    forwardRef(() => TelegramModule),
  ],
  providers: [
    TelegramProcessor,
    AIProcessor,
    BudgetCheckProcessor,
    RecurringTransactionsProcessor,
    RecurringTransactionsScheduler,
  ],
  exports: [BullModule],
})
export class QueuesModule {}
