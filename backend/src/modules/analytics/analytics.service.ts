import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { getBRTStartOfMonth, getBRTEndOfMonth, formatBRT, getBRTStartOfDay, getBRTEndOfDay, getBRTStartOfWeek, getBRTEndOfWeek, getBRTStartOfYear, getBRTEndOfYear } from '../../common/utils/date.utils';
import { subMonths, subDays, subWeeks, subYears } from 'date-fns';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getSummary(orgId: string, period: string = 'month') {
    const accounts = await this.prisma.account.findMany({ where: { orgId } });
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

    let startOfMonth = getBRTStartOfMonth();
    let endOfMonth = getBRTEndOfMonth();
    let prevStart = getBRTStartOfMonth(subMonths(new Date(), 1));
    let prevEnd = getBRTEndOfMonth(subMonths(new Date(), 1));

    if (period === 'today') {
      startOfMonth = getBRTStartOfDay();
      endOfMonth = getBRTEndOfDay();
      prevStart = getBRTStartOfDay(subDays(new Date(), 1));
      prevEnd = getBRTEndOfDay(subDays(new Date(), 1));
    } else if (period === 'week') {
      startOfMonth = getBRTStartOfWeek();
      endOfMonth = getBRTEndOfWeek();
      prevStart = getBRTStartOfWeek(subWeeks(new Date(), 1));
      prevEnd = getBRTEndOfWeek(subWeeks(new Date(), 1));
    } else if (period === 'year') {
      startOfMonth = getBRTStartOfYear();
      endOfMonth = getBRTEndOfYear();
      prevStart = getBRTStartOfYear(subYears(new Date(), 1));
      prevEnd = getBRTEndOfYear(subYears(new Date(), 1));
    }

    const [incomeAgg, expenseAgg, prevIncomeAgg, prevExpenseAgg, pendingBills] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { orgId, deletedAt: null, type: 'INCOME', date: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amountInCents: true },
      }),
      this.prisma.transaction.aggregate({
        where: { orgId, deletedAt: null, type: 'EXPENSE', date: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amountInCents: true },
      }),
      this.prisma.transaction.aggregate({
        where: { orgId, deletedAt: null, type: 'INCOME', date: { gte: prevStart, lte: prevEnd } },
        _sum: { amountInCents: true },
      }),
      this.prisma.transaction.aggregate({
        where: { orgId, deletedAt: null, type: 'EXPENSE', date: { gte: prevStart, lte: prevEnd } },
        _sum: { amountInCents: true },
      }),
      this.prisma.bill.aggregate({
        where: { orgId, status: { not: 'PAID' } },
        _sum: { amountInCents: true },
      }),
    ]);

    const income = incomeAgg._sum.amountInCents || 0;
    const expenses = expenseAgg._sum.amountInCents || 0;
    const prevIncome = prevIncomeAgg._sum.amountInCents || 0;
    const prevExpenses = prevExpenseAgg._sum.amountInCents || 0;
    const pending = pendingBills._sum.amountInCents || 0;

    const incomeDelta = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0;
    const expenseDelta = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0;
    const balance = totalBalance + income - expenses;
    const prevBalance = totalBalance + prevIncome - prevExpenses;
    const balanceDelta = prevBalance !== 0 ? ((balance - prevBalance) / Math.abs(prevBalance)) * 100 : 0;

    return {
      totalBalance,
      income,
      expenses,
      projected: totalBalance + income - expenses - pending,
      incomeDelta: Math.round(incomeDelta * 10) / 10,
      expenseDelta: Math.round(expenseDelta * 10) / 10,
      balanceDelta: Math.round(balanceDelta * 10) / 10,
    };
  }

  async getMonthlyEvolution(orgId: string) {
    const months: { month: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const referenceDate = subMonths(new Date(), i);
      const start = getBRTStartOfMonth(referenceDate);
      const end = getBRTEndOfMonth(referenceDate);
      const label = formatBRT(start, 'MMM').replace('.', '');

      const [inc, exp] = await Promise.all([
        this.prisma.transaction.aggregate({ where: { orgId, deletedAt: null, type: 'INCOME', date: { gte: start, lte: end } }, _sum: { amountInCents: true } }),
        this.prisma.transaction.aggregate({ where: { orgId, deletedAt: null, type: 'EXPENSE', date: { gte: start, lte: end } }, _sum: { amountInCents: true } }),
      ]);

      months.push({ month: label, income: inc._sum.amountInCents || 0, expense: exp._sum.amountInCents || 0 });
    }
    return months;
  }

  async getCategoryBreakdown(orgId: string, period: string = 'month') {
    let startOfMonth = getBRTStartOfMonth();
    let endOfMonth = getBRTEndOfMonth();

    if (period === 'today') {
      startOfMonth = getBRTStartOfDay();
      endOfMonth = getBRTEndOfDay();
    } else if (period === 'week') {
      startOfMonth = getBRTStartOfWeek();
      endOfMonth = getBRTEndOfWeek();
    } else if (period === 'year') {
      startOfMonth = getBRTStartOfYear();
      endOfMonth = getBRTEndOfYear();
    }

    const result = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { orgId, deletedAt: null, type: 'EXPENSE', date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amountInCents: true },
      orderBy: { _sum: { amountInCents: 'desc' } },
    });

    const categories = await this.prisma.category.findMany({ where: { orgId } });
    const catMap = new Map(categories.map(c => [c.id, c]));

    return result.map(r => {
      const cat = catMap.get(r.categoryId);
      return { id: r.categoryId, name: cat?.name || '', value: r._sum.amountInCents || 0, color: cat?.color || '' };
    });
  }

  async getTopExpenses(orgId: string, limit = 10) {
    return this.prisma.transaction.findMany({
      where: { orgId, deletedAt: null, type: 'EXPENSE' },
      orderBy: { amountInCents: 'desc' },
      take: limit,
      include: { category: true, account: true, card: true },
    });
  }

  async getMemberSpending(orgId: string) {
    const result = await this.prisma.transaction.groupBy({
      by: ['memberId'],
      where: { orgId, deletedAt: null, type: 'EXPENSE' },
      _sum: { amountInCents: true },
    });
    const members = await this.prisma.organizationMember.findMany({
      where: { orgId }, include: { user: { select: { name: true } } },
    });
    const memberMap = new Map(members.map(m => [m.id, m]));
    return result.map(r => ({ memberId: r.memberId, name: memberMap.get(r.memberId)?.user.name || '', total: r._sum.amountInCents || 0 }));
  }
}
