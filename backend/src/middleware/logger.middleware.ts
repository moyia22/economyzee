import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP_DIAGNOSTIC');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const auth = req.headers.authorization;
    const hasAuth = !!auth;
    const isBearer = auth?.startsWith('Bearer ');

    this.logger.log(
      `[REQ] ${method} ${originalUrl} | auth=${hasAuth} | bearer=${isBearer}`
    );

    if (hasAuth && !isBearer) {
      this.logger.warn(`[WARN] Header Authorization presente mas NÃO é Bearer! Valor: ${auth?.substring(0, 15)}...`);
    }

    next();
  }
}
