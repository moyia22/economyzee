import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  log(userId: string, orgId: string, action: string, entity: string, entityId?: string, metadata?: any) {
    return this.prisma.auditLog.create({ data: { userId, orgId, action, entity, entityId, metadata } });
  }

  findAll(orgId: string, page = 1, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { orgId }, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit, take: limit,
      include: { user: { select: { name: true, email: true } } },
    });
  }
}
