import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { subMonths } from 'date-fns';
import { getBRTStartOfMonth, getBRTEndOfMonth, getBRTStartOfDay, getBRTEndOfDay, formatBRT } from '../../common/utils/date.utils';

@Injectable()
export class FinancialSummaryService {
  constructor(private prisma: PrismaService) {}

  async getMonthlySummary(orgId: string, date: Date = new Date()) {
    const start = getBRTStartOfMonth(date);
    const end = getBRTEndOfMonth(date);

    const [income, expenses, topCategories] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { orgId, type: 'INCOME', date: { gte: start, lte: end }, deletedAt: null },
        _sum: { amountInCents: true }
      }),
      this.prisma.transaction.aggregate({
        where: { orgId, type: 'EXPENSE', date: { gte: start, lte: end }, deletedAt: null },
        _sum: { amountInCents: true }
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { orgId, type: 'EXPENSE', date: { gte: start, lte: end }, deletedAt: null },
        _sum: { amountInCents: true },
        orderBy: { _sum: { amountInCents: 'desc' } },
        take: 5
      })
    ]);

    const categoriesWithNames = await Promise.all(
      topCategories.map(async (c) => {
        const cat = await this.prisma.category.findUnique({ where: { id: c.categoryId } });
        return {
          name: cat?.name || 'Outros',
          amount: (c._sum.amountInCents || 0) / 100
        };
      })
    );

    const currentIncome = (income._sum.amountInCents || 0) / 100;
    const currentExpenses = (expenses._sum.amountInCents || 0) / 100;

    // Comparação mês anterior
    const prevDate = subMonths(date, 1);
    const prevStart = getBRTStartOfMonth(prevDate);
    const prevEnd = getBRTEndOfMonth(prevDate);
    const prevExpenses = await this.prisma.transaction.aggregate({
      where: { orgId, type: 'EXPENSE', date: { gte: prevStart, lte: prevEnd }, deletedAt: null },
      _sum: { amountInCents: true }
    });

    const prevExpAmount = (prevExpenses._sum.amountInCents || 0) / 100;
    const diffPercent = prevExpAmount > 0 
      ? ((currentExpenses - prevExpAmount) / prevExpAmount) * 100 
      : 0;

    return {
      period: formatBRT(start, 'MMMM/yyyy'),
      income: currentIncome,
      expenses: currentExpenses,
      balance: currentIncome - currentExpenses,
      topCategories: categoriesWithNames,
      previousMonthDiff: diffPercent
    };
  }

  async getDailySummary(orgId: string, date: Date = new Date()) {
    const start = getBRTStartOfDay(date);
    const end = getBRTEndOfDay(date);

    const expenses = await this.prisma.transaction.findMany({
      where: { orgId, type: 'EXPENSE', date: { gte: start, lte: end }, deletedAt: null },
      include: { category: true }
    });

    return {
      date: formatBRT(start, 'dd/MM/yyyy'),
      total: expenses.reduce((acc, t) => acc + t.amountInCents, 0) / 100,
      count: expenses.length,
      transactions: expenses.map(t => ({
        description: t.description,
        amount: t.amountInCents / 100,
        category: t.category.name
      }))
    };
  }

  async getCategoriesSummary(orgId: string, days: number = 90) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const categories = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { orgId, type: 'EXPENSE', date: { gte: start, lte: end }, deletedAt: null },
      _sum: { amountInCents: true },
      orderBy: { _sum: { amountInCents: 'desc' } }
    });

    const data = await Promise.all(categories.map(async (c) => {
      const cat = await this.prisma.category.findUnique({ where: { id: c.categoryId } });
      return {
        name: cat?.name || 'Outros',
        amount: (c._sum.amountInCents || 0) / 100
      };
    }));

    return {
      period: `Últimos ${days} dias`,
      data
    };
  }

  async getFiscalYearSummary(orgId: string, year: number = new Date().getFullYear()) {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);

    const transactions = await this.prisma.transaction.findMany({
      where: { orgId, date: { gte: start, lte: end }, deletedAt: null }
    });

    const income = transactions.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.amountInCents, 0) / 100;
    const expenses = transactions.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.amountInCents, 0) / 100;

    return {
      period: `Ano de ${year}`,
      income,
      expenses,
      balance: income - expenses,
      transactions: transactions.map(t => ({
        date: formatBRT(t.date, 'dd/MM/yyyy'),
        description: t.description,
        type: t.type,
        amount: t.amountInCents / 100
      }))
    };
  }

  async getInvoicesSummary(orgId: string) {
    const bills = await this.prisma.bill.findMany({
      where: { orgId },
      orderBy: { dueDate: 'desc' }
    });

    return {
      period: 'Histórico Completo',
      data: bills.map(b => ({
        description: b.name,
        dueDate: formatBRT(b.dueDate, 'dd/MM/yyyy'),
        amount: b.amountInCents / 100,
        status: b.status
      }))
    };
  }
}
