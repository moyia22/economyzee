import { Module, Global } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { SupabaseSafeService } from './supabase-safe.service';

@Global()
@Module({
  providers: [SupabaseService, SupabaseSafeService],
  exports: [SupabaseService, SupabaseSafeService],
})
export class SupabaseModule {}
