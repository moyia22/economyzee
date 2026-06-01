import { Module } from '@nestjs/common';
import { FinancialParserService } from './financial-parser.service';
import { AiParserService } from './ai-parser.service';
import { ConfigModule } from '@nestjs/config';
import { FinancialQueryParserService } from './financial-query-parser.service';

import { AiOrchestratorService } from './ai-orchestrator.service';

@Module({
  imports: [ConfigModule],
  providers: [FinancialParserService, AiParserService, AiOrchestratorService, FinancialQueryParserService],
  exports: [FinancialParserService, AiParserService, AiOrchestratorService, FinancialQueryParserService],
})
export class FinancialParserModule {}
