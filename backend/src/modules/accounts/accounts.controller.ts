import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { Roles, RolesGuard, WRITE_ROLES } from '../../common';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private svc: AccountsService) {}

  @Get()
  findAll(@Request() req: any) { return this.svc.findAll(req.user.orgId); }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@Request() req: any, @Body() body: any) { return this.svc.create(req.user.orgId, body); }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(req.user.orgId, id, body);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  delete(@Request() req: any, @Param('id') id: string) {
    return this.svc.delete(req.user.orgId, id);
  }
}
