import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';

@Processor('budget-check')
export class BudgetCheckProcessor {
  private readonly logger = new Logger(BudgetCheckProcessor.name);

  constructor(private prisma: PrismaService) {}

  @Process('check-after-transaction')
  async checkBudget(job: Job<{ orgId: string; categoryId: string }>) {
    const { orgId, categoryId } = job.data;
    this.logger.log(`Checking budget for category ${categoryId} in org ${orgId}`);

    const budget = await this.prisma.budget.findUnique({
      where: { categoryId_orgId: { categoryId, orgId } },
    });
    if (!budget) return { alert: false };

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const spent = await this.prisma.transaction.aggregate({
      where: { orgId, categoryId, type: 'EXPENSE', date: { gte: start, lte: end } },
      _sum: { amountInCents: true },
    });

    const spentAmount = spent._sum.amountInCents || 0;
    const pct = (spentAmount / budget.limitInCents) * 100;

    // Reset de alertas se trocou o mês (simples check por data da última transação ou hoje)
    // Para simplificar, vamos apenas disparar se o flag estiver falso
    
    if (pct >= 100 && !budget.threshold100Alerted) {
      const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
      await this.prisma.smartAlert.create({
        data: {
          level: 'CRITICAL',
          title: `🔥 Orçamento de ${cat?.name} estourado!`,
          message: `Você atingiu 100% do limite de R$ ${(budget.limitInCents / 100).toFixed(2)}.`,
          orgId,
        },
      });
      await this.prisma.budget.update({
        where: { id: budget.id },
        data: { threshold100Alerted: true, threshold80Alerted: true }
      });
      return { alert: true, level: 'critical', pct };
    } else if (pct >= 80 && !budget.threshold80Alerted) {
      const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
      await this.prisma.smartAlert.create({
        data: {
          level: 'WARNING',
          title: `⚠️ ${cat?.name}: 80% do limite atingido`,
          message: `Atenção! Você já usou R$ ${(spentAmount / 100).toFixed(2)} do seu orçamento.`,
          orgId,
        },
      });
      await this.prisma.budget.update({
        where: { id: budget.id },
        data: { threshold80Alerted: true }
      });
      return { alert: true, level: 'warning', pct };
    }

    return { alert: false, pct };
  }
}
