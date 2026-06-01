import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { FinancialSummaryService } from './financial-summary.service';

@Module({
  controllers: [ReportsController],
  providers: [FinancialSummaryService],
  exports: [FinancialSummaryService],
})
export class ReportsModule {}
