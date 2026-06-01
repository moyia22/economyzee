import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../email/email.service';

type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
type AssignableRole = 'ADMIN' | 'MEMBER';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private config: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async findById(id: string, userId: string) {
    await this.requireMembership(id, userId);

    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  }

  findByUserId(userId: string) {
    return this.prisma.organization.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'asc' },
      include: {
        members: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  }

  async getMember(userId: string, orgId: string) {
    return this.prisma.organizationMember.findUnique({ where: { userId_orgId: { userId, orgId } } });
  }

  async getMembers(orgId: string, userId: string) {
    await this.requireMembership(orgId, userId);

    return this.prisma.organizationMember.findMany({
      where: { orgId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async inviteMember(orgId: string, email: string, role: string = 'MEMBER', invitedById: string) {
    await this.requireManager(orgId, invitedById);

    const inviteRole = this.normalizeAssignableRole(role);
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new BadRequestException('Email invalido');
    }

    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Workspace nao encontrado');

    const existingUser = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      const alreadyMember = await this.prisma.organizationMember.findUnique({
        where: { userId_orgId: { userId: existingUser.id, orgId } },
      });
      if (alreadyMember) {
        return {
          alreadyMember: true,
          message: `${cleanEmail} ja e membro deste workspace.`,
        };
      }
    }

    const inviter = await this.prisma.user.findUnique({
      where: { id: invitedById },
      select: { name: true, email: true },
    });
    const inviterName = inviter?.name || inviter?.email || 'Um membro do workspace';

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const link = await this.prisma.inviteLink.create({
      data: {
        orgId,
        createdById: invitedById,
        role: inviteRole as any,
        invitedEmail: cleanEmail,
        expiresAt,
        maxUses: 1,
      },
    });

    const inviteUrl = `${this.getFrontendUrl()}/invite/${link.token}`;
    const { subject, html } = this.email.buildInviteEmail({
      orgName: org.name,
      inviterName,
      inviteUrl,
      role: link.role,
    });
    const emailResult = await this.email.sendEmail(cleanEmail, subject, html);

    this.logger.log(
      `[Invite] criado: org=${orgId} email=${cleanEmail} token=${link.token} ` +
      `emailSent=${emailResult.sent}${emailResult.reason ? ` (${emailResult.reason})` : ''}`,
    );

    return {
      alreadyMember: false,
      emailSent: emailResult.sent,
      emailError: emailResult.sent ? null : emailResult.reason,
      token: link.token,
      inviteUrl,
      message: emailResult.sent
        ? `Convite enviado para ${cleanEmail}. Eles precisam clicar no link recebido para aceitar.`
        : `Convite criado, mas nao foi possivel enviar o email. Copie o link e compartilhe manualmente.`,
    };
  }

  async createOrganization(userId: string, name: string) {
    const org = await this.prisma.organization.create({
      data: {
        name,
        type: 'PERSONAL',
        initials: name.substring(0, 2).toUpperCase(),
        createdById: userId,
      },
    });

    await this.prisma.organizationMember.create({
      data: {
        userId,
        orgId: org.id,
        role: 'OWNER',
      },
    });

    await this.seedWorkspaceDefaults(org.id);
    return org;
  }

  async updateOrganization(orgId: string, name: string, requesterId: string) {
    await this.requireManager(orgId, requesterId);

    return this.prisma.organization.update({
      where: { id: orgId },
      data: {
        name,
        initials: name.substring(0, 2).toUpperCase(),
      },
    });
  }

  async deleteOrganization(orgId: string, requesterId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: { orderBy: { createdAt: 'asc' } } },
    });
    if (!org) throw new NotFoundException('Workspace nao encontrado');

    const requester = org.members.find((m) => m.userId === requesterId);
    if (!requester) throw new ForbiddenException('Voce nao e membro deste workspace');
    if (!this.isOwnerRole(requester.role)) {
      throw new ForbiddenException('Apenas o Owner do workspace pode exclui-lo');
    }

    if (org.type === 'PERSONAL') {
      const userOrgsCount = await this.prisma.organizationMember.count({
        where: { userId: requesterId },
      });
      if (userOrgsCount <= 1) {
        throw new BadRequestException('Voce nao pode excluir seu unico workspace pessoal');
      }
    }

    this.logger.log(`[Org] DELETE workspace ${orgId} ("${org.name}") pelo owner ${requesterId}`);
    return this.prisma.organization.delete({ where: { id: orgId } });
  }

  async leaveOrganization(orgId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { userId_orgId: { userId, orgId } },
      include: { org: { include: { _count: { select: { members: true } } } } },
    });
    if (!member) throw new NotFoundException('Voce nao e membro deste workspace');

    if (member.org.type === 'PERSONAL') {
      const userOrgsCount = await this.prisma.organizationMember.count({ where: { userId } });
      if (userOrgsCount <= 1) {
        throw new BadRequestException('Voce nao pode sair do seu unico workspace pessoal');
      }
    }

    if (this.isOwnerRole(member.role)) {
      const otherOwners = await this.prisma.organizationMember.count({
        where: { orgId, role: 'OWNER' as any, userId: { not: userId } },
      });
      if (otherOwners === 0) {
        throw new BadRequestException('Voce e o unico Owner. Transfira o cargo de Owner antes de sair.');
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.organizationMember.delete({
        where: { userId_orgId: { userId, orgId } },
      });

      let nextOrgId = await this.findNextWorkspaceId(userId, orgId, tx);
      if (!nextOrgId) {
        nextOrgId = await this.createFallbackPersonalWorkspace(userId, tx);
      }

      return { success: true, nextOrgId };
    });

    this.logger.log(`[Org] User ${userId} saiu do workspace ${orgId}`);
    return result;
  }

  async removeMember(orgId: string, memberId: string, requesterId: string) {
    const requester = await this.requireManager(orgId, requesterId);

    const target = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: { org: true, user: { select: { name: true, email: true } } },
    });
    if (!target) throw new NotFoundException('Membro nao encontrado');
    if (target.orgId !== orgId) {
      throw new BadRequestException('Membro nao pertence a este workspace');
    }
    if (target.userId === requesterId) {
      throw new BadRequestException('Use a opcao "Sair do workspace" para remover a si mesmo');
    }

    if (this.isOwnerRole(target.role)) {
      if (!this.isOwnerRole(requester.role)) {
        throw new ForbiddenException('Apenas outro Owner pode remover um Owner');
      }

      const otherOwners = await this.prisma.organizationMember.count({
        where: { orgId, role: 'OWNER' as any, id: { not: memberId } },
      });
      if (otherOwners === 0) {
        throw new BadRequestException('Nao e possivel remover o unico Owner do workspace');
      }
    }

    await this.prisma.organizationMember.delete({ where: { id: memberId } });
    this.logger.log(`[Org] Member ${memberId} removido do workspace ${orgId} por ${requesterId}`);
    return { success: true };
  }

  async updateMemberRole(orgId: string, memberId: string, newRole: string, requesterId: string) {
    const requester = await this.requireManager(orgId, requesterId);
    const normalizedRole = this.normalizeRoleForUpdate(newRole);

    const target = await this.prisma.organizationMember.findUnique({ where: { id: memberId } });
    if (!target || target.orgId !== orgId) throw new NotFoundException('Membro nao encontrado');

    if (normalizedRole === 'OWNER' && !this.isOwnerRole(requester.role)) {
      throw new ForbiddenException('Apenas um Owner pode transferir ou conceder ownership');
    }

    if (this.isOwnerRole(target.role) && normalizedRole !== 'OWNER') {
      const otherOwners = await this.prisma.organizationMember.count({
        where: { orgId, role: 'OWNER' as any, id: { not: memberId } },
      });
      if (otherOwners === 0) {
        throw new BadRequestException('Nao e possivel rebaixar o unico Owner');
      }
    }

    if (this.isOwnerRole(target.role) && !this.isOwnerRole(requester.role)) {
      throw new ForbiddenException('Admins nao podem alterar o cargo de um Owner');
    }

    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: normalizedRole as any },
    });
  }

  async generateInviteLink(orgId: string, createdById: string, role: string = 'MEMBER', expiresInDays: number = 7) {
    await this.requireManager(orgId, createdById);
    const inviteRole = this.normalizeAssignableRole(role);

    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Workspace nao encontrado');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Math.max(1, expiresInDays || 7));

    return this.prisma.inviteLink.create({
      data: {
        orgId,
        createdById,
        role: inviteRole as any,
        expiresAt,
      },
    });
  }

  async validateInviteToken(token: string) {
    const link = await this.prisma.inviteLink.findUnique({
      where: { token },
      include: { org: true, createdBy: { select: { name: true, email: true } } },
    });

    const invalidReason = this.getInvalidInviteReason(link);
    if (invalidReason) return { valid: false, reason: invalidReason };

    return {
      valid: true,
      orgName: link!.org.name,
      orgId: link!.orgId,
      role: link!.role,
      roleLabel: this.roleLabel(link!.role),
      invitedBy: link!.createdBy.name || link!.createdBy.email,
      invitedEmailMasked: this.maskEmail(link!.invitedEmail),
    };
  }

  async acceptInvite(token: string, userId: string) {
    const acceptor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!acceptor) throw new ForbiddenException('Usuario autenticado nao encontrado no backend');

    const result = await this.prisma.$transaction(async (tx) => {
      const link = await tx.inviteLink.findUnique({
        where: { token },
        include: { org: true },
      });

      const invalidReason = this.getInvalidInviteReason(link);
      if (invalidReason) throw new BadRequestException(invalidReason);

      const invitedEmail = link!.invitedEmail?.toLowerCase();
      if (invitedEmail && acceptor.email.toLowerCase() !== invitedEmail) {
        throw new ForbiddenException(`Este convite foi enviado para ${this.maskEmail(invitedEmail)}. Entre com esse email para aceitar.`);
      }

      const existing = await tx.organizationMember.findUnique({
        where: { userId_orgId: { userId, orgId: link!.orgId } },
      });
      if (existing) {
        return {
          alreadyMember: true,
          newlyJoined: false,
          orgId: link!.orgId,
          orgName: link!.org.name,
          role: existing.role,
        };
      }

      const member = await tx.organizationMember.create({
        data: {
          userId,
          orgId: link!.orgId,
          role: link!.role,
        },
      });

      const nextUsedCount = link!.usedCount + 1;
      await tx.inviteLink.update({
        where: { id: link!.id },
        data: {
          usedCount: { increment: 1 },
          active: link!.maxUses && nextUsedCount >= link!.maxUses ? false : link!.active,
        },
      });

      return {
        alreadyMember: false,
        newlyJoined: true,
        orgId: link!.orgId,
        orgName: link!.org.name,
        role: member.role,
      };
    });

    if (result.newlyJoined) {
      const acceptorName = acceptor.name || acceptor.email.split('@')[0] || 'Novo membro';
      this.logger.log(`[Invite] aceito: user=${userId} org=${result.orgId} role=${result.role}`);
      this.eventEmitter.emit('sync.trigger', {
        type: 'member_joined',
        orgId: result.orgId,
        orgName: result.orgName,
        memberName: acceptorName,
        role: result.role,
      });
    } else {
      this.logger.log(`[Invite] aceito (ja membro): user=${userId} org=${result.orgId}`);
    }

    return result;
  }

  async revokeInviteLink(orgId: string, linkId: string, requesterId: string) {
    await this.requireManager(orgId, requesterId);

    const link = await this.prisma.inviteLink.findUnique({ where: { id: linkId } });
    if (!link || link.orgId !== orgId) throw new NotFoundException('Link de convite nao encontrado');

    return this.prisma.inviteLink.update({
      where: { id: linkId },
      data: { active: false },
    });
  }

  async getInviteLinks(orgId: string, requesterId: string) {
    await this.requireManager(orgId, requesterId);

    return this.prisma.inviteLink.findMany({
      where: { orgId, active: true },
      include: { createdBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async requireMembership(orgId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!member) throw new ForbiddenException('Voce nao e membro deste workspace');
    return member;
  }

  private async requireManager(orgId: string, userId: string) {
    const member = await this.requireMembership(orgId, userId);
    if (!this.isManagerRole(member.role)) {
      throw new ForbiddenException('Apenas Owner ou Admin podem gerenciar membros e convites');
    }

    return member;
  }

  private isManagerRole(role?: string): boolean {
    return role === 'OWNER' || role === 'ADMIN';
  }

  private isOwnerRole(role?: string): boolean {
    return role === 'OWNER';
  }

  private normalizeAssignableRole(role?: string): AssignableRole {
    const normalized = (role || 'MEMBER').toUpperCase();
    if (normalized === 'OWNER') {
      throw new BadRequestException('Owner nao pode ser atribuido por convite. Promova manualmente depois.');
    }
    if (normalized !== 'ADMIN' && normalized !== 'MEMBER') {
      throw new BadRequestException('Cargo invalido. Use Admin ou Membro.');
    }
    return normalized as AssignableRole;
  }

  private normalizeRoleForUpdate(role?: string): WorkspaceRole {
    const normalized = (role || '').toUpperCase();
    if (!['OWNER', 'ADMIN', 'MEMBER'].includes(normalized)) {
      throw new BadRequestException('Cargo invalido. Use Owner, Admin ou Membro.');
    }
    return normalized as WorkspaceRole;
  }

  private getInvalidInviteReason(link: any): string | null {
    if (!link) return 'Link de convite nao encontrado';
    if (!link.active) return 'Este convite foi revogado';
    if (link.expiresAt < new Date()) return 'Este convite expirou';
    if (link.maxUses && link.usedCount >= link.maxUses) return 'Este convite ja foi usado';
    return null;
  }

  private getFrontendUrl(): string {
    const raw = this.config.get<string>('FRONTEND_URL') || 'https://economyzee.com';
    return raw.split(',')[0].trim().replace(/\/$/, '');
  }

  private maskEmail(email?: string | null): string | null {
    if (!email) return null;
    const [name, domain] = email.split('@');
    if (!name || !domain) return email;
    const visible = name.length <= 2 ? name[0] : `${name[0]}${name[name.length - 1]}`;
    return `${visible.padEnd(Math.min(name.length, 4), '*')}@${domain}`;
  }

  private roleLabel(role?: string): string {
    if (role === 'OWNER') return 'Owner';
    if (role === 'ADMIN') return 'Admin';
    if (role === 'VIEWER') return 'Visualizador';
    return 'Membro';
  }

  private async findNextWorkspaceId(userId: string, removedOrgId: string, prisma: any = this.prisma): Promise<string | null> {
    const next = await prisma.organizationMember.findFirst({
      where: { userId, orgId: { not: removedOrgId } },
      orderBy: { createdAt: 'asc' },
      select: { orgId: true },
    });
    return next?.orgId || null;
  }

  private async createFallbackPersonalWorkspace(userId: string, prisma: any = this.prisma): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const name = user?.name || user?.email?.split('@')[0] || 'Meu workspace';

    const org = await prisma.organization.create({
      data: {
        name: `${name} - Pessoal`,
        type: 'PERSONAL',
        initials: name.substring(0, 2).toUpperCase(),
        createdById: userId,
      },
    });

    await prisma.organizationMember.create({
      data: { userId, orgId: org.id, role: 'OWNER' as any },
    });

    const defaultCats = [
      { name: 'Alimentacao', icon: 'UtensilsCrossed', color: 'var(--chart-1)' },
      { name: 'Transporte', icon: 'Car', color: 'var(--chart-2)' },
      { name: 'Moradia', icon: 'Home', color: 'var(--chart-3)' },
      { name: 'Lazer', icon: 'Music', color: 'var(--chart-4)' },
      { name: 'Saude', icon: 'HeartPulse', color: 'var(--chart-5)' },
      { name: 'Compras', icon: 'ShoppingBag', color: 'var(--chart-2)' },
      { name: 'Assinaturas', icon: 'Repeat', color: 'var(--chart-4)' },
      { name: 'Educacao', icon: 'GraduationCap', color: 'var(--chart-3)' },
      { name: 'Salario', icon: 'Wallet', color: 'var(--chart-1)' },
      { name: 'Freelance', icon: 'Briefcase', color: 'var(--chart-1)' },
      { name: 'Outros', icon: 'Sparkles', color: 'var(--chart-5)' },
    ];

    await prisma.category.createMany({
      data: defaultCats.map((c) => ({ ...c, orgId: org.id })),
    });

    await prisma.account.createMany({
      data: [
        {
          name: 'Carteira',
          bank: 'Dinheiro Fisico',
          type: 'CHECKING',
          balance: 0,
          color: '#22c55e',
          orgId: org.id,
        },
        {
          name: 'Carteira Digital (PIX)',
          bank: 'PIX',
          type: 'CHECKING',
          balance: 0,
          color: '#0ea5e9',
          orgId: org.id,
        },
      ],
    });

    return org.id;
  }

  private async seedWorkspaceDefaults(orgId: string) {
    const defaultCats = [
      { name: 'Alimentacao', icon: 'UtensilsCrossed', color: 'var(--chart-1)' },
      { name: 'Transporte', icon: 'Car', color: 'var(--chart-2)' },
      { name: 'Moradia', icon: 'Home', color: 'var(--chart-3)' },
      { name: 'Lazer', icon: 'Music', color: 'var(--chart-4)' },
      { name: 'Saude', icon: 'HeartPulse', color: 'var(--chart-5)' },
      { name: 'Compras', icon: 'ShoppingBag', color: 'var(--chart-2)' },
      { name: 'Assinaturas', icon: 'Repeat', color: 'var(--chart-4)' },
      { name: 'Educacao', icon: 'GraduationCap', color: 'var(--chart-3)' },
      { name: 'Salario', icon: 'Wallet', color: 'var(--chart-1)' },
      { name: 'Freelance', icon: 'Briefcase', color: 'var(--chart-1)' },
      { name: 'Outros', icon: 'Sparkles', color: 'var(--chart-5)' },
    ];

    await this.prisma.category.createMany({
      data: defaultCats.map((c) => ({ ...c, orgId })),
    });

    await this.prisma.account.createMany({
      data: [
        {
          name: 'Carteira',
          bank: 'Dinheiro Fisico',
          type: 'CHECKING',
          balance: 0,
          color: '#22c55e',
          orgId,
        },
        {
          name: 'Carteira Digital (PIX)',
          bank: 'PIX',
          type: 'CHECKING',
          balance: 0,
          color: '#0ea5e9',
          orgId,
        },
      ],
    });
  }
}
