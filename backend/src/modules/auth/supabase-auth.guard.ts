import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from './auth.service';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private static fallbackLogged = false;

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService,
    private config: ConfigService,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token nao fornecido');
    }

    const requestedOrgId = this.getRequestedOrgId(request);
    const localUser = await this.validateLocalToken(token, requestedOrgId);
    if (localUser) {
      request.user = localUser;
      return true;
    }

    try {
      const payload = await this.validateWithSupabase(token);
      const syncedUser = await this.authService.validateSupabaseUser(payload, requestedOrgId);

      request.user = {
        sub: syncedUser.userId,
        id: syncedUser.userId,
        email: payload.email,
        orgId: syncedUser.orgId,
        role: syncedUser.role,
      };

      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }

      const errorName = this.getNetworkErrorName(err);
      this.logger.error(`[Auth] Falha na autenticacao: ${errorName}`);
      throw new UnauthorizedException(`Falha na autenticacao Supabase: ${errorName}`);
    }
  }

  private extractToken(request: any): string {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    if (request.query.token) {
      return request.query.token as string;
    }
    return '';
  }

  private async validateLocalToken(token: string, requestedOrgId?: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      return null;
    }

    if (!payload?.sub || payload.aud === 'authenticated') {
      return null;
    }

    const localUser = await this.authService.validateLocalJwtUser(
      payload.sub,
      requestedOrgId || payload.orgId,
    );

    return {
      sub: localUser.userId,
      id: localUser.userId,
      email: localUser.email,
      orgId: localUser.orgId,
      role: localUser.role,
    };
  }

  private getRequestedOrgId(request: any): string | undefined {
    const value = request.headers['x-organization-id'];
    if (Array.isArray(value)) return value[0];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private async validateWithSupabase(token: string): Promise<any> {
    const supabase = this.supabaseService.getClient();
    const maxAttempts = 0;

    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      try {
        const userPromise = supabase.auth.getUser(token);
        userPromise.catch(() => {});

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('ConnectTimeoutError')), 2000)
        );

        const result: any = await Promise.race([userPromise, timeoutPromise]);

        if (result.error || !result.data?.user) {
          const errMsg = result.error?.message || 'Usuario nao encontrado';
          throw new Error(errMsg);
        }

        return {
          sub: result.data.user.id,
          email: result.data.user.email,
          user_metadata: result.data.user.user_metadata,
        };
      } catch (err: any) {
        const errorName = this.getNetworkErrorName(err);
        const errorLower = errorName.toLowerCase();
        const isNetworkError =
          errorLower.includes('fetch failed') ||
          errorLower.includes('timeout') ||
          errorLower.includes('connecttimeouterror') ||
          errorLower.includes('und_err_connect_timeout') ||
          errorLower.includes('econnrefused') ||
          errorLower.includes('enotfound') ||
          errorLower.includes('socket') ||
          err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT';

        const isSessionMissing = errorLower.includes('auth session missing');

        if (isNetworkError || isSessionMissing) {
          const label = isSessionMissing ? 'sessao ausente' : 'indisponivel';
          this.logger.warn(`[Auth] Supabase ${label} (tentativa ${attempt + 1}): ${errorName}`);

          if (attempt >= maxAttempts) {
            const isDev = this.config.get('NODE_ENV') === 'development';
            const allowFallback = this.config.get('SUPABASE_AUTH_FALLBACK') === 'true';

            if (isDev || allowFallback) {
              return this.handleFallback(token);
            }
            throw new Error(`Supabase ${label}: ${errorName}`);
          }
          continue;
        }

        throw new Error(this.getErrorMessage(err));
      }
    }
  }

  private handleFallback(token: string): any {
    try {
      const decoded = jwt.decode(token) as any;

      if (!decoded || decoded.aud !== 'authenticated') {
        throw new Error('Token invalido para fallback');
      }

      if (!SupabaseAuthGuard.fallbackLogged) {
        this.logger.log('Auth fallback local usado em desenvolvimento (Supabase offline)');
        SupabaseAuthGuard.fallbackLogged = true;
      }

      return {
        sub: decoded.sub,
        email: decoded.email,
        user_metadata: decoded.user_metadata || {},
      };
    } catch (err) {
      this.logger.warn(`[Auth] Falha no fallback local: ${this.getErrorMessage(err)}`);
      throw new Error('Token Supabase invalido (verificacao local falhou)');
    }
  }

  private getNetworkErrorName(error: any): string {
    if (!error) return 'UnknownError';
    if (typeof error === 'string') return error;
    if (error.message === 'ConnectTimeoutError') return 'ConnectTimeoutError';
    if (error.cause && error.cause.code) return error.cause.code;
    if (error.code) return error.code;
    return error.message || 'UnknownError';
  }

  private getErrorMessage(error: any): string {
    if (!error) return 'Erro desconhecido';
    if (typeof error === 'string') return error;
    return error.message || 'Erro desconhecido';
  }
}
