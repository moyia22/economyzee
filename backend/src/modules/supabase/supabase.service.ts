import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private client!: SupabaseClient;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_ANON_KEY');

    if (!url || !key) {
      this.logger.error('❌ SUPABASE_URL ou SUPABASE_ANON_KEY não definidos no .env');
      throw new Error('SUPABASE_URL ou SUPABASE_ANON_KEY não definidos no .env');
    }

    try {
      this.client = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });
      this.logger.log('✅ Supabase Client inicializado com sucesso');
    } catch (err) {
      this.logger.error('❌ Erro ao inicializar Supabase Client', err);
      throw err;
    }
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}
