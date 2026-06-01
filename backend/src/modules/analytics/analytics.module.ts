import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { FinancialInsightsService } from './financial-insights.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, FinancialInsightsService],
  exports: [AnalyticsService, FinancialInsightsService],
})
export class AnalyticsModule {}
