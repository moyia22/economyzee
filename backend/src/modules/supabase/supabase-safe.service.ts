import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { withTimeout, withRetry } from '../../common/utils/promise-utils';

@Injectable()
export class SupabaseSafeService {
  private readonly logger = new Logger(SupabaseSafeService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Executa uma query no banco de dados com timeout e retry.
   */
  async runQuery<T>(
    operation: () => Promise<T>,
    timeoutMs = 8000,
    retries = 1,
  ): Promise<T> {
    const startTime = Date.now();
    try {
      return await withRetry(
        () => withTimeout(operation(), timeoutMs, 'Tempo de resposta do banco excedido'),
        retries
      );
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const errorType = this.getErrorType(err);
      this.logger.error(`[SupabaseSafe] Erro após ${duration}ms: ${errorType} - ${err.message}`);
      throw err;
    }
  }

  private getErrorType(err: any): string {
    if (err.message?.includes('fetch failed')) return 'NetworkError';
    if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) return 'TimeoutError';
    if (err.code === 'P2025') return 'NotFoundError';
    return err.code || 'UnknownError';
  }
}
