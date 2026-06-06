import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BillsService {
  constructor(private prisma: PrismaService) {}

  private async requireBillInOrg(id: string, orgId: string) {
    const bill = await this.prisma.bill.findFirst({ where: { id, orgId } });
    if (!bill) {
      throw new NotFoundException('Conta a pagar nao encontrada.');
    }
    return bill;
  }

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

  async markPaid(id: string, orgId: string) {
    await this.requireBillInOrg(id, orgId);
    return this.prisma.bill.update({ where: { id }, data: { status: 'PAID' } });
  }

  async update(id: string, orgId: string, data: { name?: string; dueDate?: Date; amountInCents?: number; categoryId?: string; recurring?: boolean; status?: any }) {
    await this.requireBillInOrg(id, orgId);
    return this.prisma.bill.update({ where: { id }, data });
  }

  async delete(id: string, orgId: string) {
    await this.requireBillInOrg(id, orgId);
    return this.prisma.bill.delete({ where: { id } });
  }
}
