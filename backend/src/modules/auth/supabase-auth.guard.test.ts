import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SupabaseAuthGuard } from './supabase-auth.guard';

function createGuard() {
  return new SupabaseAuthGuard({} as any, {} as any, {} as any, {} as any) as any;
}

test('SupabaseAuthGuard extracts bearer token from Authorization header', () => {
  const guard = createGuard();

  const token = guard.extractToken({
    headers: { authorization: 'Bearer header-token' },
    query: {},
  });

  assert.equal(token, 'header-token');
});

test('SupabaseAuthGuard does not accept token from query string', () => {
  const guard = createGuard();

  const token = guard.extractToken({
    headers: {},
    query: { token: 'url-token' },
  });

  assert.equal(token, '');
});
