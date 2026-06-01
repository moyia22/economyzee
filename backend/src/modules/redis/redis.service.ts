import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export type BotState = 'IDLE' | 'AWAITING_CONFIRMATION' | 'AWAITING_CORRECTION' | 'AWAITING_CATEGORY' | 'AWAITING_AMOUNT' | 'AWAITING_TYPE' | 'AWAITING_DESCRIPTION' | 'AWAITING_FIELD' | 'AWAITING_DATE' | 'AWAITING_PAYMENT' | 'PROCESSING_RECEIPT' | 'CANCELLED' | 'AWAITING_SPLIT_DECISION' | 'AWAITING_PAYMENT_CORRECTION' | 'AWAITING_SPLIT_CARD_SELECTION' | 'AWAITING_INSTALLMENTS' | 'AWAITING_VISTA_PARCELADO';

export interface ReceiptItem {
  name: string;
  quantity: number;
  total: number;
}

export interface TransactionDraft {
  chatId: string;
  userId: string;
  orgId: string;
  type: 'expense' | 'income' | 'transfer' | 'unknown';
  amount: number | null;
  description: string;
  category: string;
  date: string; // YYYY-MM-DD
  paymentMethod: string;
  accountId?: string;
  cardId?: string;
  installments?: number;
  confidence: number;
  needsConfirmation?: boolean;
  rawText: string;
  source: 'regex' | 'ai' | 'hybrid' | 'ai_reviewed' | 'local_parser' | 'ocr' | 'voice';
  merchantName?: string;
  itemsCount?: number;
  items?: ReceiptItem[];
  createdAt: string;
  state: BotState;
  missingFields?: string[];
  // NFC-e / Receipt fields
  nfceResult?: any;
  receiptSource?: string;
  memberId?: string;
  // Split payment fields
  currentSplitPaymentIndex?: number;
  splitCardSelections?: (string | null)[];
  splitMode?: 'single' | 'separate';
  // Workspace selection (Telegram): se preenchido, sobrescreve o destino padrão (pessoal)
  targetOrgId?: string;
  targetMemberId?: string;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private isEnabled = true;

  constructor(private config: ConfigService) {
    this.isEnabled = this.config.get<string>('REDIS_ENABLED') !== 'false';
  }

  onModuleInit() {
    if (!this.isEnabled) {
      this.logger.log('⚠ Redis desativado via configuração (REDIS_ENABLED=false).');
      return;
    }

    // Suporta REDIS_URL (Railway, Upstash, Heroku) com fallback para HOST/PORT (Docker local).
    const redisUrl = this.config.get<string>('REDIS_URL');
    const retryStrategy = (times: number) => {
      const delay = Math.min(times * 100, 3000);
      if (times === 1) {
        this.logger.warn('⚠ Redis indisponível. Rodando sem cache/fila em modo degradado.');
      }
      return delay;
    };

    if (redisUrl) {
      this.client = new Redis(redisUrl, {
        retryStrategy,
        maxRetriesPerRequest: 1,
      });
    } else {
      const host = this.config.get<string>('REDIS_HOST', 'localhost');
      const port = this.config.get<number>('REDIS_PORT', 6379);
      const password = this.config.get<string>('REDIS_PASSWORD');
      const username = this.config.get<string>('REDIS_USERNAME');
      this.client = new Redis({
        host,
        port,
        password,
        username,
        retryStrategy,
        maxRetriesPerRequest: 1,
      });
    }

    this.client.on('error', (err) => {
      // Silenciar AggregateError excessivo se desejado, ou apenas logar de forma controlada
      if (err.name === 'MaxRetriesPerRequestError') {
        return;
      }
      this.logger.debug(`Redis connection error: ${err.message}`);
    });

    this.client.on('connect', () => this.logger.log('✅ Connected to Redis'));
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }

  async isConnected(): Promise<boolean> {
    if (!this.isEnabled || !this.client) return false;
    return this.client.status === 'ready';
  }

  async set(key: string, value: any, ttlInSeconds = 300): Promise<void> {
    if (!this.isEnabled || !this.client) return;
    try {
      await this.client.setex(key, ttlInSeconds, JSON.stringify(value));
    } catch (err) {
      this.logger.debug(`Failed to set key ${key} in Redis`);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled || !this.client) return null;
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      this.logger.debug(`Failed to get key ${key} from Redis`);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isEnabled || !this.client) return;
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.debug(`Failed to delete key ${key} from Redis`);
    }
  }

  /**
   * Wraps a function with caching logic.
   * @param key Cache key
   * @param ttl TTL in seconds
   * @param fn Function to execute if cache miss
   */
  async wrapCache<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  async saveDraft(chatId: string, draft: TransactionDraft): Promise<void> {
    if (!this.isEnabled || !this.client) return;
    // TTL of 10 minutes (600 seconds)
    try {
      await this.client.setex(`draft:${chatId}`, 600, JSON.stringify(draft));
    } catch (err) {
      this.logger.debug('Failed to save draft to Redis');
    }
  }

  async getDraft(chatId: string): Promise<TransactionDraft | null> {
    if (!this.isEnabled || !this.client) return null;
    try {
      const data = await this.client.get(`draft:${chatId}`);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      this.logger.debug('Failed to get draft from Redis');
      return null;
    }
  }

  async clearDraft(chatId: string): Promise<void> {
    if (!this.isEnabled || !this.client) return;
    try {
      await this.client.del(`draft:${chatId}`);
    } catch (err) {
      this.logger.debug('Failed to clear draft from Redis');
    }
  }
}
