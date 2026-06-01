import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { GeminiService } from '../ai/gemini.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private prisma: PrismaService,
    private analytics: AnalyticsService,
    private gemini: GeminiService,
  ) {}

  async getSummary(orgId: string, period?: string) {
    const p = period || 'month';
    const [summary, evolution, breakdown, recentTx, bills, cardsRaw] = await Promise.all([
      this.analytics.getSummary(orgId, p),
      this.analytics.getMonthlyEvolution(orgId),
      this.analytics.getCategoryBreakdown(orgId, p),
      this.prisma.transaction.findMany({
        where: { orgId, deletedAt: null }, orderBy: { date: 'desc' }, take: 6,
        include: { category: true, account: true, card: true, member: { include: { user: true } } },
      }),
      this.prisma.bill.findMany({
        where: { orgId, status: { not: 'PAID' } }, orderBy: { dueDate: 'asc' }, take: 4,
        include: { category: true },
      }),
      this.prisma.card.findMany({ where: { orgId } }),
    ]);

    // Enrich cards with real usage from transactions
    const now = new Date();
    let monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    if (p === 'today') {
      monthStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      monthEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (p === 'week') {
      const day = now.getDay() || 7;
      monthStart = new Date(now);
      if (day !== 1) monthStart.setHours(-24 * (day - 1));
      monthStart.setHours(0, 0, 0, 0);
      monthEnd = new Date(monthStart);
      monthEnd.setDate(monthStart.getDate() + 6);
      monthEnd.setHours(23, 59, 59, 999);
    } else if (p === 'year') {
      monthStart = new Date(now.getFullYear(), 0, 1);
      monthEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    }

    const cards = await Promise.all(cardsRaw.map(async (card) => {
      const usage = await this.prisma.transaction.aggregate({
        where: {
          cardId: card.id,
          deletedAt: null,
          type: 'EXPENSE',
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amountInCents: true },
      });
      return {
        ...card,
        usedInCents: usage._sum.amountInCents || 0,
      };
    }));

    return { summary, evolution, breakdown, recentTransactions: recentTx, upcomingBills: bills, cards };
  }

  async getTelegramFeed(orgId: string) {
    return this.prisma.telegramEvent.findMany({
      where: { orgId }, orderBy: { createdAt: 'desc' }, take: 10,
    });
  }

  async getSmartAlerts(orgId: string) {
    // Try to get manual alerts first
    const manualAlerts = await this.prisma.smartAlert.findMany({
      where: { orgId, active: true }, orderBy: { createdAt: 'desc' },
    });
    if (manualAlerts.length > 0) return manualAlerts;

    // Otherwise, generate computed insights
    return this.generateInsights(orgId);
  }

  async getCustomSmartAlerts(orgId: string) {
    return this.prisma.smartAlert.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSmartAlertFromPrompt(orgId: string, prompt: string) {
    const cleanPrompt = (prompt || '').trim();
    if (!cleanPrompt) {
      throw new BadRequestException('Descreva a notificação que deseja criar.');
    }

    // Try AI-powered generation first
    const generated = await this.generateAlertWithAI(cleanPrompt);
    return this.prisma.smartAlert.create({
      data: {
        orgId,
        level: generated.level,
        title: generated.title,
        message: generated.message,
        active: true,
      },
    });
  }

  async deleteSmartAlert(orgId: string, id: string) {
    await this.prisma.smartAlert.deleteMany({ where: { id, orgId } });
    return { success: true };
  }

  private async generateInsights(orgId: string) {
    const insights: { id: string; title: string; message: string; level: string; active: boolean; createdAt: Date }[] = [];

    try {
      const summary = await this.analytics.getSummary(orgId);
      const breakdown = await this.analytics.getCategoryBreakdown(orgId);

      // Insight 1: Expense spike
      if (summary.expenseDelta > 30) {
        insights.push({
          id: 'insight-expense-spike',
          title: `Despesas subiram ${summary.expenseDelta}%`,
          message: `Seus gastos neste mês estão ${summary.expenseDelta}% acima do mês anterior. Considere revisar seus hábitos de consumo.`,
          level: 'warning',
          active: true,
          createdAt: new Date(),
        });
      } else if (summary.expenseDelta < -10) {
        insights.push({
          id: 'insight-expense-drop',
          title: `Ótimo! Despesas reduziram ${Math.abs(summary.expenseDelta)}%`,
          message: `Você está gastando menos do que no mês anterior. Continue assim!`,
          level: 'info',
          active: true,
          createdAt: new Date(),
        });
      }

      // Insight 2: Dominant category
      if (breakdown.length > 0) {
        const total = breakdown.reduce((s: number, c: any) => s + c.value, 0);
        const top = breakdown[0];
        const topPct = total > 0 ? Math.round((top.value / total) * 100) : 0;
        if (topPct > 40) {
          insights.push({
            id: 'insight-dominant-cat',
            title: `${top.name} domina com ${topPct}% dos gastos`,
            message: `A categoria "${top.name}" representa quase metade das suas despesas. Talvez valha diversificar.`,
            level: topPct > 60 ? 'critical' : 'warning',
            active: true,
            createdAt: new Date(),
          });
        }
      }

      // Insight 3: Income growth
      if (summary.incomeDelta > 10) {
        insights.push({
          id: 'insight-income-growth',
          title: `Receita cresceu ${summary.incomeDelta}%`,
          message: `Sua receita está em tendência de alta. Bom momento para investir ou reforçar sua reserva.`,
          level: 'info',
          active: true,
          createdAt: new Date(),
        });
      }

      // Insight 4: Low balance alert
      if (summary.totalBalance < summary.expenses && summary.expenses > 0) {
        insights.push({
          id: 'insight-low-balance',
          title: 'Saldo abaixo das despesas do mês',
          message: 'Seu saldo atual é menor que o total de despesas neste mês. Atenção para não ficar no vermelho.',
          level: 'critical',
          active: true,
          createdAt: new Date(),
        });
      }
    } catch {
      // Silently fail if analytics computation errors
    }

    return insights;
  }

  /**
   * Uses Gemini AI to interpret the user's natural language prompt
   * and generate a smart alert with appropriate title, message, and severity.
   * Falls back to regex-based generation if AI is unavailable.
   */
  private async generateAlertWithAI(prompt: string): Promise<{ level: 'INFO' | 'WARNING' | 'CRITICAL'; title: string; message: string }> {
    try {
      // @ts-ignore - using internal model access
      const model = (this.gemini as any).model;
      if (!model) {
        this.logger.warn('Gemini model not available, falling back to regex');
        return this.generateAlertCopy(prompt);
      }

      const aiPrompt = `Você é o assistente financeiro do EconomyZee. O usuário quer criar uma notificação/alerta personalizado.

Prompt do usuário: "${prompt}"

Gere um JSON com:
{
  "level": "INFO" | "WARNING" | "CRITICAL",
  "title": "<título curto e claro, máximo 60 caracteres>",
  "message": "<mensagem explicativa de quando o alerta será disparado, máximo 200 caracteres>"
}

Regras:
- INFO: alertas informativos e positivos (metas, economias, insights)
- WARNING: alertas de atenção (limites, gastos altos, tendências negativas)
- CRITICAL: alertas urgentes (estouros, dívidas, vencimentos atrasados)
- O título deve ser claro e acionável
- A mensagem deve explicar a condição do alerta
- Responda APENAS com JSON válido, sem markdown`;

      const result = await model.generateContent(aiPrompt);
      const response = result.response.text();
      const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      return {
        level: ['INFO', 'WARNING', 'CRITICAL'].includes(parsed.level) ? parsed.level : 'INFO',
        title: String(parsed.title || '').slice(0, 80),
        message: String(parsed.message || '').slice(0, 240),
      };
    } catch (err) {
      this.logger.warn(`AI alert generation failed, using fallback: ${err}`);
      return this.generateAlertCopy(prompt);
    }
  }

  /** Regex-based fallback for alert generation */
  private generateAlertCopy(prompt: string) {
    const normalized = prompt.toLowerCase();
    const level =
      /atras|vencid|urgente|crítico|critico|negativo|vermelho/.test(normalized)
        ? 'CRITICAL' as const
        : /limite|acima|estour|passar|maior|alto|risco/.test(normalized)
          ? 'WARNING' as const
          : 'INFO' as const;

    const categoryMatch = prompt.match(/(?:em|de|da|do|para)\s+([a-zà-ú\s]{3,32})(?:\s+(?:passar|acima|maior|chegar|quando)|$)/i);
    const amountMatch = prompt.match(/(?:r\$?\s*)(\d{2,}(?:[.,]\d{1,2})?)/i);
    const category = categoryMatch?.[1]?.trim();

    const title = category
      ? `Monitorar ${this.capitalize(category)}`
      : 'Notificação inteligente';

    const amount = amountMatch?.[1]
      ? `R$ ${amountMatch[1].replace('.', ',')}`
      : null;

    const message = amount
      ? `A IA vai destacar este alerta quando a condição chegar perto de ${amount}: ${prompt}`
      : `A IA vai acompanhar esta regra personalizada: ${prompt}`;

    return { level, title: title.slice(0, 80), message: message.slice(0, 240) };
  }

  private capitalize(value: string) {
    return value
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
