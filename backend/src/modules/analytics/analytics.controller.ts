import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}

  @Get('summary')
  summary(@Request() req: any) { return this.svc.getSummary(req.user.orgId); }

  @Get('monthly-evolution')
  monthlyEvolution(@Request() req: any) { return this.svc.getMonthlyEvolution(req.user.orgId); }

  @Get('category-breakdown')
  categoryBreakdown(@Request() req: any) { return this.svc.getCategoryBreakdown(req.user.orgId); }

  @Get('top-expenses')
  topExpenses(@Request() req: any, @Query('limit') limit?: number) { return this.svc.getTopExpenses(req.user.orgId, limit || 10); }

  @Get('member-spending')
  memberSpending(@Request() req: any) { return this.svc.getMemberSpending(req.user.orgId); }
}
