import { Controller, Sse, MessageEvent, UseGuards, Request } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent, filter, map } from 'rxjs';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

const FINANCIAL_SYNC_EVENTS = new Set([
  'transaction_created',
  'transaction_updated',
  'transaction_deleted',
  'transactions_reset',
]);

@ApiTags('Real-Time Sync (SSE)')
@Controller('sync')
export class SseController {
  constructor(private eventEmitter: EventEmitter2) {}

  @ApiOperation({ summary: 'Subscribe to real-time events' })
  @UseGuards(SupabaseAuthGuard)
  @Sse('events')
  sse(@Request() req: any): Observable<MessageEvent> {
    const user = req.user;

    // Escuta o evento 'sync.trigger' emitido internamente pelo NestJS
    return fromEvent(this.eventEmitter, 'sync.trigger').pipe(
      filter((payload: any) => this.canDeliver(payload, user)),
      map((payload: any) => {
        return {
          data: payload,
        } as MessageEvent;
      }),
    );
  }

  private canDeliver(payload: any, user: any): boolean {
    if (!payload || typeof payload !== 'object' || !user?.orgId) {
      return false;
    }

    if (FINANCIAL_SYNC_EVENTS.has(payload.type) && !payload.orgId) {
      return false;
    }

    if (payload.userId && payload.userId !== user.sub && payload.userId !== user.id) {
      return false;
    }

    if (payload.orgId && payload.orgId !== user.orgId) {
      return false;
    }

    return !!payload.orgId || !!payload.userId;
  }
}
