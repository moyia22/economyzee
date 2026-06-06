import { Controller, Get, Post, Patch, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { Roles, RolesGuard, WRITE_ROLES } from '../../common';

@ApiTags('Cards')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('cards')
export class CardsController {
  constructor(private svc: CardsService) {}

  @Get()
  findAll(@Request() req: any) { return this.svc.findAll(req.user.orgId, req.user.id); }

  // ---- Vínculo de cartões pessoais ao workspace (rotas estáticas antes das com :id) ----
  @Get('links')
  getLinks(@Request() req: any) {
    return this.svc.getLinkState(req.user.orgId, req.user.id);
  }

  @Put('links/auto')
  @Roles(...WRITE_ROLES)
  setAutoLink(@Request() req: any, @Body() body: { enabled?: boolean }) {
    return this.svc.setAutoLink(req.user.orgId, req.user.id, !!body?.enabled);
  }

  @Put('links/:cardId')
  @Roles(...WRITE_ROLES)
  setCardLink(@Request() req: any, @Param('cardId') cardId: string, @Body() body: { linked?: boolean }) {
    return this.svc.setCardLink(req.user.orgId, req.user.id, cardId, !!body?.linked);
  }
  // ---------------------------------------------------------------------------------------

  @Post()
  @Roles(...WRITE_ROLES)
  create(@Request() req: any, @Body() body: any) {
    return this.svc.create(req.user.orgId, body, req.user.role);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, body, req.user.orgId, req.user.role);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  delete(@Request() req: any, @Param('id') id: string) {
    return this.svc.delete(id, req.user.orgId, req.user.role);
  }

  @Get(':id/invoices')
  getInvoices(@Request() req: any, @Param('id') id: string) {
    return this.svc.getInvoices(id, req.user.orgId, req.user.id);
  }
}
