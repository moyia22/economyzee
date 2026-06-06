import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BillsService } from './bills.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { Roles, RolesGuard, WRITE_ROLES } from '../../common';

@ApiTags('Bills')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('bills')
export class BillsController {
  constructor(private svc: BillsService) {}

  @Get()
  findAll(@Request() req: any) { return this.svc.findAll(req.user.orgId); }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@Request() req: any, @Body() body: any) { return this.svc.create(req.user.orgId, body); }

  @Post(':id/mark-paid')
  @Roles(...WRITE_ROLES)
  markPaid(@Request() req: any, @Param('id') id: string) { return this.svc.markPaid(id, req.user.orgId); }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) { return this.svc.update(id, req.user.orgId, body); }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  delete(@Request() req: any, @Param('id') id: string) { return this.svc.delete(id, req.user.orgId); }
}
