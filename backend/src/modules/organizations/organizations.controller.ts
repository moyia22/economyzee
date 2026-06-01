import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private svc: OrganizationsService) {}

  @Get()
  findAll(@Request() req: any) { return this.svc.findByUserId(req.user.id); }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) { return this.svc.findById(id, req.user.id); }

  @Get(':id/members')
  getMembers(@Param('id') id: string, @Request() req: any) { return this.svc.getMembers(id, req.user.id); }

  @Post(':id/invite')
  invite(@Param('id') id: string, @Request() req: any, @Body() body: { email: string; role?: string }) {
    return this.svc.inviteMember(id, body.email, body.role, req.user.id);
  }

  @Post()
  create(@Request() req: any, @Body() body: { name: string }) {
    return this.svc.createOrganization(req.user.id, body.name);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name: string }, @Request() req: any) {
    return this.svc.updateOrganization(id, body.name, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.svc.deleteOrganization(id, req.user.id);
  }

  // Sair do workspace (o próprio usuário)
  @Post(':id/leave')
  leave(@Param('id') id: string, @Request() req: any) {
    return this.svc.leaveOrganization(id, req.user.id);
  }

  // Remover um membro especifico (Owner/Admin)
  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req: any,
  ) {
    return this.svc.removeMember(id, memberId, req.user.id);
  }

  // Alterar cargo de um membro (Owner/Admin)
  @Patch(':id/members/:memberId/role')
  updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: { role: string },
    @Request() req: any,
  ) {
    return this.svc.updateMemberRole(id, memberId, body.role, req.user.id);
  }

  // ======== INVITE LINK ENDPOINTS ========

  @Post(':id/invite-link')
  generateInviteLink(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { role?: string; expiresInDays?: number },
  ) {
    return this.svc.generateInviteLink(id, req.user.id, body.role, body.expiresInDays);
  }

  @Get(':id/invite-links')
  getInviteLinks(@Param('id') id: string, @Request() req: any) {
    return this.svc.getInviteLinks(id, req.user.id);
  }

  @Delete(':id/invite-link/:linkId')
  revokeInviteLink(@Param('id') id: string, @Param('linkId') linkId: string, @Request() req: any) {
    return this.svc.revokeInviteLink(id, linkId, req.user.id);
  }
}

// Separate controller for public invite validation (no auth required)
@ApiTags('Invites')
@Controller(['invite', 'invites'])
export class InviteController {
  constructor(private svc: OrganizationsService) {}

  @Get(':token')
  validate(@Param('token') token: string) {
    return this.svc.validateInviteToken(token);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post(':token/accept')
  accept(@Param('token') token: string, @Request() req: any) {
    return this.svc.acceptInvite(token, req.user.id);
  }
}
