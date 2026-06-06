import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canRegisterWebhook,
  isWebhookSecretConfigured,
  shouldAcceptWebhook,
} from './telegram-webhook.util';

// ── Aceitação de requisições (handleWebhook) ────────────────────────────────

test('produção SEM WEBHOOK_SECRET rejeita o webhook (fail-closed)', () => {
  assert.equal(
    shouldAcceptWebhook({ isProduction: true, expectedSecret: undefined, providedSecret: 'whatever' }),
    false,
  );
  assert.equal(
    shouldAcceptWebhook({ isProduction: true, expectedSecret: '', providedSecret: '' }),
    false,
  );
  assert.equal(
    shouldAcceptWebhook({ isProduction: true, expectedSecret: '   ', providedSecret: '   ' }),
    false,
  );
});

test('produção COM WEBHOOK_SECRET e secret válido aceita o webhook', () => {
  assert.equal(
    shouldAcceptWebhook({ isProduction: true, expectedSecret: 's3cr3t', providedSecret: 's3cr3t' }),
    true,
  );
});

test('produção COM WEBHOOK_SECRET e secret inválido rejeita o webhook', () => {
  assert.equal(
    shouldAcceptWebhook({ isProduction: true, expectedSecret: 's3cr3t', providedSecret: 'errado' }),
    false,
  );
  assert.equal(
    shouldAcceptWebhook({ isProduction: true, expectedSecret: 's3cr3t', providedSecret: undefined }),
    false,
  );
});

test('desenvolvimento mantém comportamento atual (não quebra dev)', () => {
  // sem secret configurado -> aceita
  assert.equal(
    shouldAcceptWebhook({ isProduction: false, expectedSecret: undefined, providedSecret: undefined }),
    true,
  );
  // com secret configurado -> valida
  assert.equal(
    shouldAcceptWebhook({ isProduction: false, expectedSecret: 'dev', providedSecret: 'dev' }),
    true,
  );
  assert.equal(
    shouldAcceptWebhook({ isProduction: false, expectedSecret: 'dev', providedSecret: 'x' }),
    false,
  );
});

// ── Registro do webhook (onModuleInit / setWebhook) ─────────────────────────

test('produção só registra webhook com WEBHOOK_SECRET configurado', () => {
  assert.equal(canRegisterWebhook({ isProduction: true, expectedSecret: undefined }), false);
  assert.equal(canRegisterWebhook({ isProduction: true, expectedSecret: '' }), false);
  assert.equal(canRegisterWebhook({ isProduction: true, expectedSecret: 's3cr3t' }), true);
});

test('desenvolvimento sempre pode registrar (não bloqueia dev)', () => {
  assert.equal(canRegisterWebhook({ isProduction: false, expectedSecret: undefined }), true);
});

test('isWebhookSecretConfigured trata vazio/whitespace como não configurado', () => {
  assert.equal(isWebhookSecretConfigured(undefined), false);
  assert.equal(isWebhookSecretConfigured(null), false);
  assert.equal(isWebhookSecretConfigured(''), false);
  assert.equal(isWebhookSecretConfigured('   '), false);
  assert.equal(isWebhookSecretConfigured('abc'), true);
});
