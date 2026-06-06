import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RealtimeGateway } from './realtime.gateway';

function createClient(overrides: Record<string, unknown> = {}) {
  const joinedRooms: string[] = [];
  const emitted: Array<{ event: string; payload: unknown }> = [];
  let disconnected = false;

  const client = {
    id: 'socket-1',
    data: {},
    handshake: {
      headers: {},
      query: {},
      auth: {},
    },
    join: (room: string) => {
      joinedRooms.push(room);
    },
    emit: (event: string, payload: unknown) => {
      emitted.push({ event, payload });
    },
    disconnect: () => {
      disconnected = true;
    },
    ...overrides,
  } as any;

  return {
    client,
    joinedRooms,
    emitted,
    get disconnected() {
      return disconnected;
    },
  };
}

function createGateway(authGuard: { canActivate: (context: any) => unknown }) {
  const gateway = new RealtimeGateway(authGuard as any);
  const emitted: Array<{ room?: string; event: string; payload: unknown }> = [];

  gateway.server = {
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => {
        emitted.push({ room, event, payload });
      },
    }),
    emit: (event: string, payload: unknown) => {
      emitted.push({ event, payload });
    },
  } as any;

  return { gateway, emitted };
}

test('subscribe ignores arbitrary userId and joins only authenticated user rooms', () => {
  const { gateway } = createGateway({ canActivate: () => true });
  const { client, joinedRooms } = createClient();
  client.data.user = { sub: 'user-auth', orgId: 'org-auth' };

  gateway.handleSubscribe(client, { userId: 'user-victim' });

  assert.deepEqual(joinedRooms, ['user_user-auth', 'user_user-auth_org_org-auth']);
  assert.equal(joinedRooms.includes('user_user-victim'), false);
});

test('subscribe rejects clients without authenticated socket user', () => {
  const { gateway } = createGateway({ canActivate: () => true });
  const socket = createClient();

  gateway.handleSubscribe(socket.client, { userId: 'user-victim' });

  assert.deepEqual(socket.joinedRooms, []);
  assert.equal(socket.disconnected, true);
  assert.equal(socket.emitted[0].event, 'unauthorized');
});

test('connection authenticates with token and stores only the authenticated user', async () => {
  let requestSeen: any;
  const { gateway } = createGateway({
    canActivate: (context: any) => {
      requestSeen = context.switchToHttp().getRequest();
      requestSeen.user = { sub: 'user-auth', orgId: 'org-auth', role: 'MEMBER' };
      return true;
    },
  });

  const { client, joinedRooms } = createClient({
    handshake: {
      headers: {},
      query: {},
      auth: { token: 'token-1', orgId: 'org-auth' },
    },
  });

  await gateway.handleConnection(client);

  assert.equal(requestSeen.headers.authorization, 'Bearer token-1');
  assert.equal(requestSeen.headers['x-organization-id'], 'org-auth');
  assert.deepEqual(client.data.user, { sub: 'user-auth', orgId: 'org-auth', role: 'MEMBER' });
  assert.deepEqual(joinedRooms, ['user_user-auth', 'user_user-auth_org_org-auth']);
});

test('sendToUser emits workspace-scoped financial events only to the user-workspace room', () => {
  const { gateway, emitted } = createGateway({ canActivate: () => true });

  gateway.sendToUser('user-auth', 'transaction_updated', { id: 'tx-1', orgId: 'org-auth' });

  assert.deepEqual(emitted, [
    {
      room: 'user_user-auth_org_org-auth',
      event: 'transaction_updated',
      payload: { id: 'tx-1', orgId: 'org-auth' },
    },
  ]);
});

test('sendToUser blocks financial events without workspace identity', () => {
  const { gateway, emitted } = createGateway({ canActivate: () => true });

  gateway.sendToUser('user-auth', 'transaction_deleted', { id: 'tx-1' });

  assert.deepEqual(emitted, []);
});

test('broadcast blocks financial events', () => {
  const { gateway, emitted } = createGateway({ canActivate: () => true });

  gateway.broadcast('transaction_created', { id: 'tx-1', orgId: 'org-auth' });

  assert.deepEqual(emitted, []);
});
