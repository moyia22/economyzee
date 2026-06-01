import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../email/email.service';

const EMAIL_CODE_TTL_MINUTES = 10;
const EMAIL_CODE_MAX_ATTEMPTS = 5;
const EMAIL_CODE_RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_CODE_MAX_PER_HOUR = 5;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailService,
  ) {}

  async register(email: string, name: string, password: string) {
    const cleanEmail = this.normalizeEmail(email);
    const cleanName = (name || cleanEmail.split('@')[0]).trim();

    if (password.length < 6) {
      throw new BadRequestException('A senha deve ter pelo menos 6 caracteres.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let user = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { memberships: true },
    });

    if (user?.emailVerified) {
      throw new BadRequestException('Este email ja esta cadastrado. Faca login para continuar.');
    }

    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          name: cleanName,
          passwordHash,
          emailVerified: false,
          emailVerifiedAt: null,
        },
        include: { memberships: true },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          email: cleanEmail,
          name: cleanName,
          passwordHash,
          emailVerified: false,
        },
        include: { memberships: true },
      });
    }

    if (user.memberships.length === 0) {
      await this.createInitialWorkspace(user.id, cleanName);
    }

    await this.issueVerificationCode(user.id, cleanEmail, cleanName);

    return {
      success: true,
      email: cleanEmail,
      emailVerificationRequired: true,
      message: `Enviamos um codigo de verificacao para ${cleanEmail}.`,
    };
  }

  async login(email: string, password: string) {
    const cleanEmail = this.normalizeEmail(email);
    const user = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { memberships: true },
    });
    if (!user) throw new UnauthorizedException('Credenciais invalidas');

    if (!user.emailVerified) {
      throw new UnauthorizedException('Verifique seu email antes de entrar.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais invalidas');

    const membership = user.memberships[0];
    if (!membership) throw new UnauthorizedException('Sem organizacao');
    return this.buildToken(user.id, membership.orgId, membership.role);
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        timezone: true,
        emailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string | null }) {
    const name = typeof data.name === 'string' ? data.name.trim() : undefined;
    const phone = typeof data.phone === 'string' ? data.phone.trim() : data.phone;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(name ? { name } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        timezone: true,
        emailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });
  }

  async getEmailVerificationStatus(email: string) {
    const cleanEmail = this.normalizeEmail(email);
    const user = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { emailVerified: true, emailVerifiedAt: true },
    });

    return {
      email: cleanEmail,
      emailVerified: !!user?.emailVerified,
      emailVerifiedAt: user?.emailVerifiedAt || null,
    };
  }

  async verifyEmailCode(email: string, code: string) {
    const cleanEmail = this.normalizeEmail(email);
    const cleanCode = String(code || '').trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      throw new BadRequestException('Codigo invalido.');
    }

    const now = new Date();
    const verification = await this.prisma.emailVerificationCode.findFirst({
      where: { email: cleanEmail, usedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });

    if (!verification) {
      throw new BadRequestException('Codigo invalido ou expirado.');
    }

    if (verification.expiresAt < now) {
      await this.prisma.emailVerificationCode.update({
        where: { id: verification.id },
        data: { usedAt: now },
      });
      throw new BadRequestException('Codigo expirado. Solicite um novo codigo.');
    }

    if (verification.attempts >= EMAIL_CODE_MAX_ATTEMPTS) {
      await this.prisma.emailVerificationCode.update({
        where: { id: verification.id },
        data: { usedAt: now },
      });
      throw new BadRequestException('Muitas tentativas. Solicite um novo codigo.');
    }

    const matches = await bcrypt.compare(cleanCode, verification.codeHash);
    if (!matches) {
      const attempts = verification.attempts + 1;
      await this.prisma.emailVerificationCode.update({
        where: { id: verification.id },
        data: {
          attempts,
          usedAt: attempts >= EMAIL_CODE_MAX_ATTEMPTS ? now : null,
        },
      });
      throw new BadRequestException(
        attempts >= EMAIL_CODE_MAX_ATTEMPTS
          ? 'Muitas tentativas. Solicite um novo codigo.'
          : 'Codigo invalido.',
      );
    }

    const user =
      verification.user ||
      (await this.prisma.user.findUnique({ where: { email: cleanEmail } }));

    if (!user) {
      throw new BadRequestException('Codigo invalido ou expirado.');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationCode.update({
        where: { id: verification.id },
        data: { usedAt: now },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: now,
        },
      }),
    ]);

    return {
      success: true,
      email: cleanEmail,
      message: 'Email verificado com sucesso.',
    };
  }

  async resendEmailCode(email: string) {
    const cleanEmail = this.normalizeEmail(email);
    const user = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, name: true, email: true, emailVerified: true },
    });

    if (!user) {
      return {
        success: true,
        email: cleanEmail,
        message: 'Se existir uma conta pendente para este email, enviaremos um novo codigo.',
      };
    }

    if (user.emailVerified) {
      return {
        success: true,
        email: cleanEmail,
        alreadyVerified: true,
        message: 'Este email ja foi verificado.',
      };
    }

    await this.issueVerificationCode(user.id, cleanEmail, user.name);

    return {
      success: true,
      email: cleanEmail,
      message: 'Enviamos um novo codigo de verificacao.',
    };
  }

  async validateSupabaseUser(payload: any, requestedOrgId?: string) {
    const { sub: supabaseId, email, user_metadata } = payload;
    const cleanEmail = this.normalizeEmail(email);
    const name = user_metadata?.full_name || cleanEmail.split('@')[0];

    try {
      let user = await this.prisma.user.findUnique({
        where: { email: cleanEmail },
        include: { memberships: { include: { org: true } } },
      });

      if (!user) {
        console.log(`[Auth] Criando usuario local para: ${cleanEmail}`);
        user = await this.prisma.user.create({
          data: {
            id: supabaseId,
            email: cleanEmail,
            name,
            passwordHash: 'SUPABASE_AUTH',
            emailVerified: false,
          },
          include: { memberships: { include: { org: true } } },
        });

        await this.createInitialWorkspace(user.id, name);
        user = await this.prisma.user.findUnique({
          where: { id: user.id },
          include: { memberships: { include: { org: true } } },
        });
      }

      if (!user?.memberships || user.memberships.length === 0) {
        await this.createInitialWorkspace(user!.id, name);
        user = await this.prisma.user.findUnique({
          where: { id: user!.id },
          include: { memberships: { include: { org: true } } },
        });
      }

      if (!user?.emailVerified) {
        throw new UnauthorizedException('Verifique seu email antes de entrar.');
      }

      let membership = user.memberships.find((m) => m.orgId === requestedOrgId);
      if (!membership) {
        membership = user.memberships[0];
      }

      return {
        userId: user.id,
        orgId: membership.orgId,
        role: membership.role,
        emailVerified: user.emailVerified,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      console.error('[Auth] Erro critico na validacao do usuario:', error);
      throw new UnauthorizedException('Falha na sincronizacao do usuario local');
    }
  }

  async validateLocalJwtUser(userId: string, requestedOrgId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { include: { org: true }, orderBy: { createdAt: 'asc' } } },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado.');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Verifique seu email antes de entrar.');
    }

    if (!user.memberships.length) {
      await this.createInitialWorkspace(user.id, user.name);
      const membership = await this.prisma.organizationMember.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      });

      if (!membership) {
        throw new UnauthorizedException('Sem organizacao');
      }

      return {
        userId: user.id,
        email: user.email,
        orgId: membership.orgId,
        role: membership.role,
        emailVerified: user.emailVerified,
      };
    }

    const membership =
      user.memberships.find((m) => m.orgId === requestedOrgId) ||
      user.memberships[0];

    return {
      userId: user.id,
      email: user.email,
      orgId: membership.orgId,
      role: membership.role,
      emailVerified: user.emailVerified,
    };
  }

  private normalizeEmail(email: string) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new BadRequestException('Email invalido.');
    }
    return cleanEmail;
  }

  private async issueVerificationCode(userId: string, email: string, name?: string | null) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const lastCode = await this.prisma.emailVerificationCode.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (
      lastCode &&
      now.getTime() - lastCode.createdAt.getTime() < EMAIL_CODE_RESEND_COOLDOWN_SECONDS * 1000
    ) {
      throw new HttpException(
        `Aguarde ${EMAIL_CODE_RESEND_COOLDOWN_SECONDS} segundos antes de solicitar outro codigo.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const codesInLastHour = await this.prisma.emailVerificationCode.count({
      where: { email, createdAt: { gte: oneHourAgo } },
    });

    if (codesInLastHour >= EMAIL_CODE_MAX_PER_HOUR) {
      throw new HttpException(
        'Limite de codigos por hora atingido. Tente novamente mais tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(now.getTime() + EMAIL_CODE_TTL_MINUTES * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.emailVerificationCode.updateMany({
        where: { email, usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.emailVerificationCode.create({
        data: {
          email,
          userId,
          codeHash,
          expiresAt,
        },
      }),
    ]);

    const { subject, html } = this.email.buildVerificationCodeEmail({
      name,
      code,
      expiresInMinutes: EMAIL_CODE_TTL_MINUTES,
    });
    const emailResult = await this.email.sendEmail(email, subject, html);

    if (!emailResult.sent) {
      throw new ServiceUnavailableException(
        emailResult.reason || 'Nao foi possivel enviar o codigo de verificacao.',
      );
    }
  }

  private async createInitialWorkspace(userId: string, name: string) {
    const org = await this.prisma.organization.create({
      data: {
        name: `${name} - Pessoal`,
        type: 'PERSONAL',
        initials: name.substring(0, 2).toUpperCase(),
        createdById: userId,
      },
    });

    await this.prisma.organizationMember.create({
      data: { userId, orgId: org.id, role: 'OWNER' },
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
    await this.prisma.category.createMany({
      data: defaultCats.map((c) => ({ ...c, orgId: org.id })),
    });

    await this.prisma.account.createMany({
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
  }

  private buildToken(userId: string, orgId: string, role: string) {
    const payload = { sub: userId, orgId, role, typ: 'local' };
    return { accessToken: this.jwt.sign(payload), userId, orgId, role };
  }
}
