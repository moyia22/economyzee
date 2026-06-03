import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CategoryMemoryService } from './category-memory.service';

// Prisma falso em memória, tipado como any para o construtor.
function makeFakePrisma(rows: any[] = []) {
  return {
    rows,
    userCategoryMemory: {
      async findUnique({ where }: any) {
        const { userId, token } = where.userId_token;
        return rows.find((r) => r.userId === userId && r.token === token) || null;
      },
      async update({ where, data }: any) {
        const { userId, token } = where.userId_token;
        const row = rows.find((r) => r.userId === userId && r.token === token);
        if (row && data.hitCount?.increment) row.hitCount += data.hitCount.increment;
        if (row && data.category) row.category = data.category;
        return row;
      },
      async upsert({ where, create, update }: any) {
        const { userId, token } = where.userId_token;
        const row = rows.find((r) => r.userId === userId && r.token === token);
        if (row) {
          Object.assign(row, update);
          return row;
        }
        const created = { hitCount: 0, ...create };
        rows.push(created);
        return created;
      },
    },
  };
}

test('learn grava o token -> categoria', async () => {
  const prisma = makeFakePrisma();
  const svc = new CategoryMemoryService(prisma as any);
  await svc.learn('u1', 'gasto de 110 com o claude', 'Assinaturas');
  assert.equal(prisma.rows.length, 1);
  assert.deepEqual(
    { userId: prisma.rows[0].userId, token: prisma.rows[0].token, category: prisma.rows[0].category },
    { userId: 'u1', token: 'claude', category: 'Assinaturas' },
  );
});

test('learn ignora categoria genérica Outros', async () => {
  const prisma = makeFakePrisma();
  const svc = new CategoryMemoryService(prisma as any);
  await svc.learn('u1', 'gasto com o claude', 'Outros');
  assert.equal(prisma.rows.length, 0);
});

test('learn ignora quando não há token válido', async () => {
  const prisma = makeFakePrisma();
  const svc = new CategoryMemoryService(prisma as any);
  await svc.learn('u1', 'gastei 110', 'Assinaturas');
  assert.equal(prisma.rows.length, 0);
});

test('applyTo sobrescreve a categoria e incrementa hitCount', async () => {
  const prisma = makeFakePrisma([
    { userId: 'u1', token: 'claude', category: 'Assinaturas', hitCount: 0 },
  ]);
  const svc = new CategoryMemoryService(prisma as any);
  const draft: any = { rawText: 'gasto de 40 com o claude', category: 'Moradia' };
  const applied = await svc.applyTo('u1', draft);
  assert.equal(applied, true);
  assert.equal(draft.category, 'Assinaturas');
  assert.equal(prisma.rows[0].hitCount, 1);
});

test('applyTo não faz nada quando não há memória', async () => {
  const prisma = makeFakePrisma();
  const svc = new CategoryMemoryService(prisma as any);
  const draft: any = { rawText: 'gasto de 40 com o claude', category: 'Moradia' };
  const applied = await svc.applyTo('u1', draft);
  assert.equal(applied, false);
  assert.equal(draft.category, 'Moradia');
});

test('cenário do print: aprende e aplica no próximo lançamento', async () => {
  const prisma = makeFakePrisma();
  const svc = new CategoryMemoryService(prisma as any);
  await svc.learn('u1', 'gasto de 110 com o claude', 'Assinaturas');

  const draft: any = { rawText: 'gasto de 40 com o claude', category: 'Moradia' };
  await svc.applyTo('u1', draft);
  assert.equal(draft.category, 'Assinaturas');
});
