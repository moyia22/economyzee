import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

type RealtimeUser = {
  sub: string;
  id?: string;
  email?: string;
  orgId: string;
  role?: string;
};

type AuthenticatedSocket = Socket & {
  data: Socket['data'] & {
    user?: RealtimeUser;
  };
};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private logger: Logger = new Logger('RealtimeGateway');
  private readonly financialEvents = new Set([
    'transaction_created',
    'transaction_updated',
    'transaction_deleted',
    'transactions_reset',
  ]);

  constructor(private readonly authGuard: SupabaseAuthGuard) {}

  @SubscribeMessage('subscribe')
  handleSubscribe(client: AuthenticatedSocket, payload?: { userId?: string }): void {
    const user = client.data.user;
    if (!user) {
      this.rejectClient(client, 'Subscribe recusado sem autenticacao');
      return;
    }

    if (payload?.userId && payload.userId !== user.sub) {
      this.logger.warn(`Client ${client.id} tentou assinar user_${payload.userId}; autorizado apenas user_${user.sub}`);
    }

    this.joinAuthorizedRooms(client, user);
    this.logger.log(`Client ${client.id} subscribed to user_${user.sub} in org_${user.orgId}`);
  }

  afterInit(server: Server) {
    this.logger.log('Realtime Gateway Initialized');
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    try {
      const user = await this.authenticateClient(client);
      client.data.user = user;
      this.joinAuthorizedRooms(client, user);
      this.logger.log(`Client connected: ${client.id} user_${user.sub} org_${user.orgId}`);
    } catch (error) {
      this.rejectClient(client, 'Conexao websocket recusada sem autenticacao valida');
    }
  }

  sendToUser(userId: string, event: string, data: any) {
    const orgId = this.getPayloadOrgId(data);

    if (this.financialEvents.has(event) && !orgId) {
      this.logger.warn(`Evento financeiro ${event} bloqueado: orgId ausente no payload`);
      return;
    }

    const room = orgId ? this.getUserWorkspaceRoom(userId, orgId) : this.getUserRoom(userId);
    this.server.to(room).emit(event, data);
  }

  broadcast(event: string, data: any) {
    if (this.financialEvents.has(event)) {
      this.logger.warn(`Broadcast financeiro ${event} bloqueado para evitar vazamento de dados`);
      return;
    }

    this.server.emit(event, data);
  }

  private async authenticateClient(client: Socket): Promise<RealtimeUser> {
    const request = this.createAuthRequest(client);
    await this.authGuard.canActivate({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any);

    const user = request.user as RealtimeUser | undefined;
    if (!user?.sub || !user?.orgId) {
      throw new Error('Usuario autenticado invalido para websocket');
    }

    return user;
  }

  private createAuthRequest(client: Socket): { headers: Record<string, any>; query: Record<string, any>; user?: RealtimeUser } {
    const headers: Record<string, any> = { ...client.handshake.headers };
    const query: Record<string, any> = { ...client.handshake.query };
    const auth = client.handshake.auth || {};

    const token =
      this.firstString(auth.token) ||
      this.firstString(query.token) ||
      this.extractBearerToken(this.firstString(headers.authorization));

    if (token) {
      headers.authorization = `Bearer ${token}`;
    }

    const orgId =
      this.firstString(auth.orgId) ||
      this.firstString(auth.organizationId) ||
      this.firstString(headers['x-organization-id']);

    if (orgId) {
      headers['x-organization-id'] = orgId;
    }

    return { headers, query };
  }

  private joinAuthorizedRooms(client: AuthenticatedSocket, user: RealtimeUser): void {
    client.join(this.getUserRoom(user.sub));
    client.join(this.getUserWorkspaceRoom(user.sub, user.orgId));
  }

  private rejectClient(client: Socket, reason: string): void {
    this.logger.warn(`${reason}: ${client.id}`);
    client.emit('unauthorized', { message: 'Unauthorized' });
    client.disconnect(true);
  }

  private getPayloadOrgId(data: any): string | undefined {
    if (!data || typeof data !== 'object') return undefined;
    return typeof data.orgId === 'string' && data.orgId.length > 0 ? data.orgId : undefined;
  }

  private getUserRoom(userId: string): string {
    return `user_${userId}`;
  }

  private getUserWorkspaceRoom(userId: string, orgId: string): string {
    return `user_${userId}_org_${orgId}`;
  }

  private firstString(value: unknown): string | undefined {
    if (Array.isArray(value)) return this.firstString(value[0]);
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private extractBearerToken(authorization?: string): string | undefined {
    if (!authorization?.startsWith('Bearer ')) return undefined;
    return authorization.slice('Bearer '.length);
  }
}
