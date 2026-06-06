import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentMethod, TransactionType } from '@prisma/client';
import { RecurringTransactionsService } from './recurring-transactions.service';

function createService(tx: Record<string, any>) {
  const realtimeCalls: any[][] = [];
  const realtime = { sendToUser: (...args: any[]) => realtimeCalls.push(args) } as any;
  const state = { started: 0, committed: 0, rolledBack: 0 };

  const prisma: any = {
    ...tx,
    $transaction: async (cb: (client: any) => Promise<unknown>) => {
      state.started += 1;
      try {
        const result = await cb(tx);
        state.committed += 1;
        return result;
      } catch (err) {
        state.rolledBack += 1;
        throw err;
      }
    },
  };

  return { service: new RecurringTransactionsService(prisma, realtime), realtimeCalls, state };
}

const validMember = { organizationMember: { findUnique: async () => ({ id: 'member-1', userId: 'user-1' }) } };
const validCategory = { category: { findFirst: async () => ({ id: 'cat-1', orgId: 'org-1' }) } };

test('create persists recurrence with account effect, audit and realtime', async () => {
  const created: any[] = [];
  const audits: any[] = [];
  const { service, realtimeCalls, state } = createService({
    ...validMember,
    ...validCategory,
    account: { findFirst: async () => ({ id: 'acc-1', orgId: 'org-1' }) },
    card: { findFirst: async () => null },
    recurringTransaction: {
      create: async (args: any) => {
        created.push(args.data);
        return { id: 'rec-1', orgId: 'org-1', ...args.data };
      },
    },
    auditLog: { create: async (args: any) => audits.push(args.data) },
  });

  const result: any = await service.create('org-1', 'user-1', {
    description: 'Netflix',
    amountInCents: 5000,
    type: TransactionType.EXPENSE,
    categoryId: 'cat-1',
    accountId: 'acc-1',
    frequency: 'MONTHLY',
    nextOccurrence: '2026-07-01T12:00:00.000Z',
  });

  assert.equal(state.committed, 1);
  assert.equal(created[0].accountId, 'acc-1');
  assert.equal(created[0].cardId, null);
  assert.equal(created[0].paymentMethod, PaymentMethod.ACCOUNT);
  assert.equal(created[0].memberId, 'member-1');
  assert.equal(audits[0].action, 'RECURRING_TRANSACTION_CREATED');
  assert.equal(audits[0].entity, 'RecurringTransaction');
  assert.equal(realtimeCalls[0][1], 'recurring_transaction_created');
  assert.equal(result.id, 'rec-1');
});

test('create with card infers CREDIT_CARD payment method', async () => {
  const created: any[] = [];
  const { service } = createService({
    ...validMember,
    ...validCategory,
    account: { findFirst: async () => null },
    card: { findFirst: async () => ({ id: 'card-1', orgId: 'org-1', cardType: 'CREDIT' }) },
    recurringTransaction: { create: async (args: any) => { created.push(args.data); return { id: 'rec-1', ...args.data }; } },
    auditLog: { create: async () => ({}) },
  });

  await service.create('org-1', 'user-1', {
    description: 'Plano',
    amountInCents: 9900,
    type: TransactionType.EXPENSE,
    categoryId: 'cat-1',
    cardId: 'card-1',
    frequency: 'MONTHLY',
    nextOccurrence: '2026-07-01',
  });

  assert.equal(created[0].cardId, 'card-1');
  assert.equal(created[0].accountId, null);
  assert.equal(created[0].paymentMethod, PaymentMethod.CREDIT_CARD);
});

test('create rejects when neither account nor card is provided', async () => {
  const { service } = createService({
    ...validMember,
    ...validCategory,
    recurringTransaction: { create: async () => { throw new Error('should not create'); } },
  });

  await assert.rejects(
    () => service.create('org-1', 'user-1', {
      description: 'X',
      amountInCents: 100,
      type: TransactionType.EXPENSE,
      categoryId: 'cat-1',
      frequency: 'MONTHLY',
      nextOccurrence: '2026-07-01',
    }),
    BadRequestException,
  );
});

test('create rejects a category from another workspace', async () => {
  const { service } = createService({
    ...validMember,
    category: { findFirst: async () => null },
    recurringTransaction: { create: async () => { throw new Error('should not create'); } },
  });

  await assert.rejects(
    () => service.create('org-1', 'user-1', {
      description: 'X',
      amountInCents: 100,
      type: TransactionType.EXPENSE,
      categoryId: 'cat-foreign',
      accountId: 'acc-1',
      frequency: 'MONTHLY',
      nextOccurrence: '2026-07-01',
    }),
    BadRequestException,
  );
});

test('create rejects a non-member user', async () => {
  const { service } = createService({
    organizationMember: { findUnique: async () => null },
    recurringTransaction: { create: async () => { throw new Error('should not create'); } },
  });

  await assert.rejects(
    () => service.create('org-1', 'intruder', {
      description: 'X',
      amountInCents: 100,
      type: TransactionType.EXPENSE,
      categoryId: 'cat-1',
      accountId: 'acc-1',
      frequency: 'MONTHLY',
      nextOccurrence: '2026-07-01',
    }),
    BadRequestException,
  );
});

test('update rejects a recurrence from another workspace (IDOR)', async () => {
  let updateCalled = false;
  const { service, state } = createService({
    recurringTransaction: {
      findFirst: async (args: any) => {
        assert.deepEqual(args.where, { id: 'rec-x', orgId: 'org-1' });
        return null;
      },
      update: async () => { updateCalled = true; return {}; },
    },
  });

  await assert.rejects(() => service.update('rec-x', 'org-1', 'user-1', { amountInCents: 1 }), NotFoundException);
  assert.equal(updateCalled, false);
  assert.equal(state.rolledBack, 1);
});

test('delete removes a recurrence in the workspace with audit and realtime', async () => {
  const audits: any[] = [];
  let deletedId: string | null = null;
  const { service, realtimeCalls } = createService({
    recurringTransaction: {
      findFirst: async () => ({ id: 'rec-1', orgId: 'org-1' }),
      delete: async (args: any) => { deletedId = args.where.id; return { id: 'rec-1' }; },
    },
    auditLog: { create: async (args: any) => audits.push(args.data) },
  });

  const result = await service.delete('rec-1', 'org-1', 'user-1');

  assert.deepEqual(result, { success: true, id: 'rec-1' });
  assert.equal(deletedId, 'rec-1');
  assert.equal(audits[0].action, 'RECURRING_TRANSACTION_DELETED');
  assert.equal(realtimeCalls[0][1], 'recurring_transaction_deleted');
});

test('delete rejects a recurrence from another workspace (IDOR)', async () => {
  let deleteCalled = false;
  const { service } = createService({
    recurringTransaction: {
      findFirst: async () => null,
      delete: async () => { deleteCalled = true; return {}; },
    },
  });

  await assert.rejects(() => service.delete('rec-x', 'org-1', 'user-1'), NotFoundException);
  assert.equal(deleteCalled, false);
});
