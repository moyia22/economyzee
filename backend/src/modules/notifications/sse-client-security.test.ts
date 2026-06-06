import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

test('frontend realtime sync does not send JWT in EventSource URL', () => {
  const source = readFileSync(resolve(process.cwd(), '../src/hooks/useRealTimeSync.ts'), 'utf8');

  assert.equal(source.includes('new EventSource'), false);
  assert.equal(source.includes('?token='), false);
  assert.equal(source.includes('Authorization: `Bearer ${token}`'), true);
});

test('HTTP request logs do not use originalUrl with query string', () => {
  const main = readFileSync(resolve(process.cwd(), 'src/main.ts'), 'utf8');
  const middleware = readFileSync(resolve(process.cwd(), 'src/middleware/logger.middleware.ts'), 'utf8');

  assert.equal(main.includes('${req.method} ${req.originalUrl}'), false);
  assert.equal(middleware.includes('${method} ${originalUrl}'), false);
  assert.equal(main.includes('getSafeRequestUrl(req)'), true);
  assert.equal(middleware.includes('split'), true);
});
