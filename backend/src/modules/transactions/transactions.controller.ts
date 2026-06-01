import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private svc: TransactionsService) {}

  @Get()
  findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('account') account?: string,
    @Query('origin') origin?: string,
    @Query('type') type?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.svc.findAll(req.user.orgId, { search, category, account, origin, type, page, limit });
  }

  @Post()
  create(@Request() req: any, @Body() body: any) {
    return this.svc.create(req.user.orgId, { ...body, userId: req.user.sub });
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, { ...body, userId: req.user.sub });
  }

  @Get('trash')
  getTrash(@Request() req: any) {
    return this.svc.getTrash(req.user.orgId);
  }

  @Post('trash/restore-all')
  restoreAllTrash(@Request() req: any) {
    return this.svc.restoreAll(req.user.orgId);
  }

  @Post('reset/:period')
  resetTransactions(@Request() req: any, @Param('period') period: 'day' | 'week' | 'month' | 'all') {
    return this.svc.resetTransactions(req.user.orgId, req.user.sub, period);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.svc.restore(id);
  }

  @Delete(':id/permanent')
  deletePermanent(@Request() req: any, @Param('id') id: string) {
    return this.svc.deletePermanent(id, req.user.sub);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}
