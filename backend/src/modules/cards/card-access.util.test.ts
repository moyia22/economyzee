import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canWriteCards, decideCardWrite } from './card-access.util';

const WS = 'org_workspace';
const PERSONAL = 'org_personal';

test('canWriteCards: VIEWER não pode escrever', () => {
  assert.equal(canWriteCards('VIEWER'), false);
});

test('canWriteCards: OWNER/ADMIN/MEMBER podem escrever', () => {
  assert.equal(canWriteCards('OWNER'), true);
  assert.equal(canWriteCards('ADMIN'), true);
  assert.equal(canWriteCards('MEMBER'), true);
});

test('canWriteCards: role indefinido é permitido (chamadas internas)', () => {
  assert.equal(canWriteCards(undefined), true);
});

test('VIEWER nunca pode escrever, mesmo com org correta', () => {
  assert.equal(decideCardWrite({ orgId: WS }, WS, 'VIEWER'), 'FORBIDDEN_ROLE');
});

test('VIEWER recebe FORBIDDEN_ROLE mesmo se o cartão não existir (não vaza existência)', () => {
  assert.equal(decideCardWrite(null, WS, 'VIEWER'), 'FORBIDDEN_ROLE');
});

test('cartão inexistente -> NOT_FOUND', () => {
  assert.equal(decideCardWrite(null, WS, 'MEMBER'), 'NOT_FOUND');
});

test('cartão de outra org -> NOT_FOUND (não vaza existência)', () => {
  assert.equal(decideCardWrite({ orgId: 'org_outra' }, WS, 'ADMIN'), 'NOT_FOUND');
});

test('cartão pessoal vinculado, acessado pelo workspace -> NOT_FOUND', () => {
  // No contexto do workspace, activeOrgId = WS, mas o cartão pessoal tem orgId = PERSONAL.
  assert.equal(decideCardWrite({ orgId: PERSONAL }, WS, 'OWNER'), 'NOT_FOUND');
});

test('cartão da própria org com role de escrita -> ALLOW', () => {
  assert.equal(decideCardWrite({ orgId: WS }, WS, 'OWNER'), 'ALLOW');
  assert.equal(decideCardWrite({ orgId: WS }, WS, 'ADMIN'), 'ALLOW');
  assert.equal(decideCardWrite({ orgId: WS }, WS, 'MEMBER'), 'ALLOW');
});

test('cartão pessoal acessado no próprio contexto pessoal -> ALLOW', () => {
  // No contexto pessoal, activeOrgId = PERSONAL = card.orgId: o dono pode editar.
  assert.equal(decideCardWrite({ orgId: PERSONAL }, PERSONAL, 'OWNER'), 'ALLOW');
});

test('role indefinido (não-VIEWER) com org correta -> ALLOW (membership já garantida pelo guard)', () => {
  assert.equal(decideCardWrite({ orgId: WS }, WS, undefined), 'ALLOW');
});
