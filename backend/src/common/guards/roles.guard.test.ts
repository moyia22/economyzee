import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RolesGuard } from './roles.guard';
import { WRITE_ROLES } from '../decorators/roles.decorator';

function createGuard(requiredRoles?: string[]) {
  return new RolesGuard({
    getAllAndOverride: () => requiredRoles,
  } as any);
}

function createContext(role?: string) {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => ({
        user: role ? { role } : undefined,
      }),
    }),
  } as any;
}

test('RolesGuard allows routes without role metadata', () => {
  const guard = createGuard(undefined);

  assert.equal(guard.canActivate(createContext('VIEWER')), true);
});

test('RolesGuard blocks VIEWER from write roles', () => {
  const guard = createGuard([...WRITE_ROLES]);

  assert.equal(guard.canActivate(createContext('VIEWER')), false);
});

test('RolesGuard allows OWNER, ADMIN and MEMBER for write roles', () => {
  const guard = createGuard([...WRITE_ROLES]);

  assert.equal(guard.canActivate(createContext('OWNER')), true);
  assert.equal(guard.canActivate(createContext('ADMIN')), true);
  assert.equal(guard.canActivate(createContext('MEMBER')), true);
});

test('RolesGuard blocks missing authenticated role on protected routes', () => {
  const guard = createGuard([...WRITE_ROLES]);

  assert.equal(guard.canActivate(createContext()), false);
});
