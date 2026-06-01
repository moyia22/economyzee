import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BillsService {
  constructor(private prisma: PrismaService) {}

  findAll(orgId: string) {
    return this.prisma.bill.findMany({
      where: { orgId },
      orderBy: { dueDate: 'asc' },
      include: { category: true },
    });
  }

  create(orgId: string, data: {
    name: string; dueDate: Date; amountInCents: number;
    categoryId: string; recurring?: boolean;
  }) {
    return this.prisma.bill.create({ data: { ...data, orgId } });
  }

  async markPaid(id: string) {
    return this.prisma.bill.update({ where: { id }, data: { status: 'PAID' } });
  }

  update(id: string, data: { name?: string; dueDate?: Date; amountInCents?: number; categoryId?: string; recurring?: boolean; status?: any }) {
    return this.prisma.bill.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.bill.delete({ where: { id } });
  }
}
