import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractMemoryToken } from './category-memory.util';

test('extrai o termo desconhecido do gasto', () => {
  assert.equal(extractMemoryToken('gasto de 110 com o claude'), 'claude');
  assert.equal(extractMemoryToken('gasto de 40 com o claude'), 'claude');
});

test('ignora valor, verbos e conectores', () => {
  assert.equal(extractMemoryToken('gastei 50 reais no spotify'), 'spotify');
  assert.equal(extractMemoryToken('paguei 30 pix netflix'), 'netflix');
});

test('escolhe o token mais longo quando há vários', () => {
  assert.equal(extractMemoryToken('uber e claude'), 'claude');
  assert.equal(extractMemoryToken('mercado pao'), 'mercado');
});

test('usa só a primeira linha, ignorando a correção anexada', () => {
  assert.equal(extractMemoryToken('gasto de 110 com o claude\nCorrecao: Assinaturas'), 'claude');
});

test('retorna null quando não sobra token significativo', () => {
  assert.equal(extractMemoryToken('gastei 110'), null);
  assert.equal(extractMemoryToken('110'), null);
  assert.equal(extractMemoryToken(''), null);
});
