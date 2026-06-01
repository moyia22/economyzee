import { Controller, Sse, MessageEvent, UseGuards } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent, map } from 'rxjs';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@ApiTags('Real-Time Sync (SSE)')
@Controller('sync')
export class SseController {
  constructor(private eventEmitter: EventEmitter2) {}

  @ApiOperation({ summary: 'Subscribe to real-time events' })
  @UseGuards(SupabaseAuthGuard)
  @Sse('events')
  sse(): Observable<MessageEvent> {
    // Escuta o evento 'sync.trigger' emitido internamente pelo NestJS
    return fromEvent(this.eventEmitter, 'sync.trigger').pipe(
      map((payload: any) => {
        return {
          data: payload,
        } as MessageEvent;
      }),
    );
  }
}
