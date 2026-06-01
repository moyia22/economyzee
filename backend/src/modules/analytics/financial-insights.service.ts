import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { startOfMonth, subDays, subMonths } from 'date-fns';

@Injectable()
export class FinancialInsightsService {
  constructor(private prisma: PrismaService) {}

  async getInsights(orgId: string) {
    const insights: string[] = [];
    const now = new Date();

    // 1. Gasto anormal detectado (últimos 7 dias vs média diária do mês anterior)
    const last7Days = await this.prisma.transaction.aggregate({
      where: { orgId, type: 'EXPENSE', date: { gte: subDays(now, 7) }, deletedAt: null },
      _sum: { amountInCents: true }
    });

    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = startOfMonth(now);
    const prevMonthTotal = await this.prisma.transaction.aggregate({
      where: { orgId, type: 'EXPENSE', date: { gte: prevMonthStart, lt: prevMonthEnd }, deletedAt: null },
      _sum: { amountInCents: true }
    });

    const dailyAvgLast7 = (last7Days._sum.amountInCents || 0) / 7;
    const dailyAvgPrev = (prevMonthTotal._sum.amountInCents || 0) / 30;

    if (dailyAvgLast7 > dailyAvgPrev * 1.3) {
      const diff = Math.round((dailyAvgLast7 / dailyAvgPrev - 1) * 100);
      insights.push(`🚀 Seus gastos diários subiram ${diff}% nos últimos 7 dias comparado ao mês passado.`);
    }

    // 2. Anomalias (Transação muito acima da média da categoria)
    const topTransaction = await this.prisma.transaction.findFirst({
      where: { orgId, type: 'EXPENSE', date: { gte: subDays(now, 3) }, deletedAt: null },
      orderBy: { amountInCents: 'desc' },
      include: { category: true }
    });

    if (topTransaction && topTransaction.amountInCents > 50000) { // > R$ 500
       insights.push(`🚨 Identifiquei um gasto relevante de R$ ${(topTransaction.amountInCents/100).toFixed(2)} em ${topTransaction.category.name}.`);
    }

    // 3. Frequência de gastos
    const transactionsCount = await this.prisma.transaction.count({
      where: { orgId, type: 'EXPENSE', date: { gte: subDays(now, 7) }, deletedAt: null }
    });

    if (transactionsCount > 15) {
      insights.push(`📱 Você fez muitas transações pequenas ultimamente (${transactionsCount} em 7 dias). Tente consolidar gastos!`);
    }

    if (insights.length === 0) {
      insights.push("✅ Sua saúde financeira parece estável. Continue mantendo seus registros atualizados!");
    }

    return insights;
  }
}
