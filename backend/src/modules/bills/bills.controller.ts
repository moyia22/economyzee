import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BillsService } from './bills.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@ApiTags('Bills')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('bills')
export class BillsController {
  constructor(private svc: BillsService) {}

  @Get()
  findAll(@Request() req: any) { return this.svc.findAll(req.user.orgId); }

  @Post()
  create(@Request() req: any, @Body() body: any) { return this.svc.create(req.user.orgId, body); }

  @Post(':id/mark-paid')
  markPaid(@Param('id') id: string) { return this.svc.markPaid(id); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.svc.delete(id); }
}
