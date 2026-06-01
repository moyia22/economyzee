import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { AIModule } from '../ai/ai.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { CategoriesModule } from '../categories/categories.module';
import { FinancialParserModule } from '../financial-parser/financial-parser.module';
import { SpeechModule } from '../speech/speech.module';
import { RedisModule } from '../redis/redis.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { ReportsModule } from '../reports/reports.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    AIModule,
    TransactionsModule, 
    CategoriesModule, 
    FinancialParserModule, 
    SpeechModule, 
    RedisModule, 
    ReceiptsModule,
    ReportsModule,
    AnalyticsModule,
    BullModule.registerQueue({
      name: 'telegram-message-processing',
    }),
  ],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
