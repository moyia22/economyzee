import { Body, Controller, Delete, Get, Param, Post, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { Roles, RolesGuard, WRITE_ROLES } from '../../common';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @Get('summary')
  summary(@Request() req: any, @Query('period') period?: string) { return this.svc.getSummary(req.user.orgId, period); }

  @Get('telegram-feed')
  telegramFeed(@Request() req: any) { return this.svc.getTelegramFeed(req.user.orgId); }

  @Get('smart-alerts')
  smartAlerts(@Request() req: any) { return this.svc.getSmartAlerts(req.user.orgId); }

  @Get('custom-alerts')
  customAlerts(@Request() req: any) { return this.svc.getCustomSmartAlerts(req.user.orgId); }

  @Post('smart-alerts')
  @Roles(...WRITE_ROLES)
  createSmartAlert(@Request() req: any, @Body() body: { prompt: string }) {
    return this.svc.createSmartAlertFromPrompt(req.user.orgId, body.prompt);
  }

  @Delete('smart-alerts/:id')
  @Roles(...WRITE_ROLES)
  deleteSmartAlert(@Request() req: any, @Param('id') id: string) {
    return this.svc.deleteSmartAlert(req.user.orgId, id);
  }
}
