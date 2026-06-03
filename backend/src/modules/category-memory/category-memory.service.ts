import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { extractMemoryToken } from '../financial-parser/category-memory.util';

@Injectable()
export class CategoryMemoryService {
  private readonly logger = new Logger(CategoryMemoryService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Lê a memória do usuário e, se houver um token aprendido, sobrescreve
   * `draft.category`. Retorna true se aplicou. Nunca lança.
   */
  async applyTo(userId: string, draft: { rawText: string; category: string }): Promise<boolean> {
    try {
      const token = extractMemoryToken(draft.rawText);
      if (!token) return false;

      const mem = await this.prisma.userCategoryMemory.findUnique({
        where: { userId_token: { userId, token } },
      });
      if (!mem || mem.category === draft.category) return false;

      draft.category = mem.category;
      await this.prisma.userCategoryMemory.update({
        where: { userId_token: { userId, token } },
        data: { hitCount: { increment: 1 } },
      });
      this.logger.log(`[CategoryMemory] Aplicado: "${token}" -> ${mem.category} (user ${userId})`);
      return true;
    } catch (e: any) {
      this.logger.warn(`[CategoryMemory] applyTo falhou: ${e.message}`);
      return false;
    }
  }

  /**
   * Aprende/atualiza o mapeamento token -> categoria do usuário.
   * Ignora categorias genéricas e tokens inválidos. Nunca lança.
   */
  async learn(userId: string, rawText: string, category: string): Promise<void> {
    try {
      const token = extractMemoryToken(rawText);
      if (!token) return;
      if (!category || category.trim().toLowerCase() === 'outros') return;

      await this.prisma.userCategoryMemory.upsert({
        where: { userId_token: { userId, token } },
        create: { userId, token, category, hitCount: 1 },
        update: { category },
      });
      this.logger.log(`[CategoryMemory] Aprendido: "${token}" -> ${category} (user ${userId})`);
    } catch (e: any) {
      this.logger.warn(`[CategoryMemory] learn falhou: ${e.message}`);
    }
  }
}
