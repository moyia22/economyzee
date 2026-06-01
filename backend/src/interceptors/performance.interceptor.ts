import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('PERF');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    
    // For HTTP
    if (request) {
      const method = request.method;
      const url = request.url;

      return next.handle().pipe(
        tap(() => {
          const delay = Date.now() - now;
          this.logger.log(`${method} ${url} - ${delay}ms`);
        }),
      );
    }

    // For other contexts (like RPC or WebSockets)
    return next.handle().pipe(
      tap(() => {
        const delay = Date.now() - now;
        const className = context.getClass().name;
        const handlerName = context.getHandler().name;
        this.logger.log(`${className}#${handlerName} - ${delay}ms`);
      }),
    );
  }
}
