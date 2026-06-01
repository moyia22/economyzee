import { Processor, Process } from '@nestjs/bull';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { TelegramService } from '../modules/telegram/telegram.service';
import { withTimeout } from '../common/utils/promise-utils';

@Processor('telegram-message-processing')
export class TelegramProcessor {
  private readonly logger = new Logger(TelegramProcessor.name);

  constructor(
    @Inject(forwardRef(() => TelegramService))
    private telegramService: TelegramService,
  ) {}

  @Process('process-message')
  async handleMessage(job: Job<any>) {
    const { type = 'text', chatId, messageId } = job.data;
    const timeoutMs = type === 'text' ? 25000 : 50000;
    
    this.logger.log(`[Telegram] Processing ${type} (Job ${job.id}) from chat ${chatId}`);

    try {
      await withTimeout(
        this.telegramService.processQueuedMessage(job.data),
        timeoutMs,
        'O processamento demorou mais que o esperado. Tente novamente em alguns segundos.'
      );
      this.logger.log(`[Telegram] Success processing job ${job.id}`);
    } catch (err: any) {
      this.logger.error(`[Telegram] Error processing job ${job.id}: ${err.message}`);
      
      // Enviar resposta final de erro se possível
      try {
        const errorMsg = err.code === 'ETIMEDOUT' 
          ? '⚠️ Demorou mais que o esperado. Tente novamente em alguns segundos.'
          : '❌ Ops! Tive um problema ao processar sua mensagem. Tente novamente.';
        
        if (this.telegramService.bot && chatId && messageId) {
          await this.telegramService.bot.api.editMessageText(chatId, messageId, errorMsg);
        }
      } catch (e: any) {
        this.logger.warn(`[Telegram] Could not send error feedback to user: ${e.message}`);
      }
    }
  }
}
