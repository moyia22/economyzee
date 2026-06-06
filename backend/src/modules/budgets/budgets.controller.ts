import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { Roles, RolesGuard, WRITE_ROLES } from '../../common';

@ApiTags('Budgets')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private svc: BudgetsService) {}

  @Get()
  findAll(@Request() req: any) { return this.svc.findAll(req.user.orgId); }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@Request() req: any, @Body() body: any) { return this.svc.create(req.user.orgId, body); }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  delete(@Param('id') id: string) { return this.svc.delete(id); }
}
