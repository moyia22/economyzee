import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { firstValueFrom, take } from 'rxjs';
import { SseController } from './sse.controller';

function createController() {
  const emitter = new EventEmitter2();
  const controller = new SseController(emitter);
  const req = {
    user: {
      sub: 'user-1',
      id: 'user-1',
      orgId: 'org-1',
    },
  };

  return { controller, emitter, req };
}

test('SSE delivers events for the authenticated workspace', async () => {
  const { controller, emitter, req } = createController();
  const payload = { type: 'member_joined', orgId: 'org-1', memberName: 'Ana' };
  const nextEvent = firstValueFrom(controller.sse(req).pipe(take(1)));

  emitter.emit('sync.trigger', payload);

  const event = await nextEvent;
  assert.deepEqual(event.data, payload);
});

test('SSE blocks events from other workspaces', async () => {
  const { controller, emitter, req } = createController();
  const received: unknown[] = [];
  const subscription = controller.sse(req).subscribe((event) => received.push(event));

  emitter.emit('sync.trigger', { type: 'member_joined', orgId: 'org-2', memberName: 'Ana' });
  await new Promise((resolve) => setImmediate(resolve));

  subscription.unsubscribe();
  assert.deepEqual(received, []);
});

test('SSE blocks financial events without orgId', async () => {
  const { controller, emitter, req } = createController();
  const received: unknown[] = [];
  const subscription = controller.sse(req).subscribe((event) => received.push(event));

  emitter.emit('sync.trigger', { type: 'transaction_created' });
  await new Promise((resolve) => setImmediate(resolve));

  subscription.unsubscribe();
  assert.deepEqual(received, []);
});

test('SSE blocks events targeted to another user', async () => {
  const { controller, emitter, req } = createController();
  const received: unknown[] = [];
  const subscription = controller.sse(req).subscribe((event) => received.push(event));

  emitter.emit('sync.trigger', { type: 'member_joined', orgId: 'org-1', userId: 'user-2' });
  await new Promise((resolve) => setImmediate(resolve));

  subscription.unsubscribe();
  assert.deepEqual(received, []);
});
