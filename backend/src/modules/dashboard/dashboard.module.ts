import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [AnalyticsModule, AIModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
