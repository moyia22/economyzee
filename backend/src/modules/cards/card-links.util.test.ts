import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveLinked, resolveLinkedCardIds } from './card-links.util';

test('effectiveLinked: sem override segue o autoLink', () => {
  assert.equal(effectiveLinked(undefined, true), true);
  assert.equal(effectiveLinked(undefined, false), false);
});

test('effectiveLinked: override vence o autoLink', () => {
  assert.equal(effectiveLinked(false, true), false);
  assert.equal(effectiveLinked(true, false), true);
});

test('resolveLinkedCardIds: autoLink off, sem links -> vazio', () => {
  const result = resolveLinkedCardIds(['a', 'b'], [], false);
  assert.deepEqual([...result].sort(), []);
});

test('resolveLinkedCardIds: autoLink on, sem links -> todos', () => {
  const result = resolveLinkedCardIds(['a', 'b'], [], true);
  assert.deepEqual([...result].sort(), ['a', 'b']);
});

test('resolveLinkedCardIds: autoLink on com override linked=false exclui o cartão', () => {
  const result = resolveLinkedCardIds(['a', 'b'], [{ cardId: 'b', linked: false }], true);
  assert.deepEqual([...result].sort(), ['a']);
});

test('resolveLinkedCardIds: autoLink off com override linked=true inclui só esse', () => {
  const result = resolveLinkedCardIds(['a', 'b'], [{ cardId: 'a', linked: true }], false);
  assert.deepEqual([...result].sort(), ['a']);
});

test('resolveLinkedCardIds: override de cardId inexistente é ignorado', () => {
  const result = resolveLinkedCardIds(['a'], [{ cardId: 'zzz', linked: true }], false);
  assert.deepEqual([...result].sort(), []);
});
