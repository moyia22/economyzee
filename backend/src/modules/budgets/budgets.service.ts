import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { getBRTStartOfMonth, getBRTStartOfWeek } from '../../common/utils/date.utils';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { orgId }, include: { category: true },
    });
    return Promise.all(budgets.map(async (b) => {
      const start = b.period === 'WEEKLY' ? getBRTStartOfWeek() : getBRTStartOfMonth();

      const spent = await this.prisma.transaction.aggregate({
        where: { orgId, categoryId: b.categoryId, type: 'EXPENSE', date: { gte: start }, deletedAt: null },
        _sum: { amountInCents: true },
      });
      return { ...b, spentInCents: spent._sum.amountInCents || 0 };
    }));
  }

  create(orgId: string, data: { categoryId: string; limitInCents: number; period?: 'MONTHLY' | 'WEEKLY' }) {
    return this.prisma.budget.upsert({
      where: { categoryId_orgId: { categoryId: data.categoryId, orgId } },
      update: { 
        limitInCents: data.limitInCents, 
        period: data.period || 'MONTHLY',
        threshold80Alerted: false,
        threshold100Alerted: false
      },
      create: { 
        ...data, 
        orgId,
        period: data.period || 'MONTHLY'
      },
    });
  }

  update(id: string, data: { limitInCents?: number; period?: 'MONTHLY' | 'WEEKLY' }) {
    return this.prisma.budget.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.budget.delete({ where: { id } });
  }
}
