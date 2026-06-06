import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { PaymentMethod, TransactionType } from '@prisma/client';
import { TransactionsService } from './transactions.service';

function createService(prisma: Record<string, unknown>) {
  const realtimeCalls: unknown[][] = [];
  const realtimeGateway = {
    sendToUser: (...args: unknown[]) => realtimeCalls.push(args),
  } as any;
  const supabaseSafeService = {} as any;

  return {
    service: new TransactionsService(prisma as any, realtimeGateway, supabaseSafeService),
    realtimeCalls,
  };
}

function createTransactionalPrisma(tx: Record<string, unknown>) {
  const state = {
    started: 0,
    committed: 0,
    rolledBack: 0,
  };

  const prisma = {
    $transaction: async (callback: (client: Record<string, unknown>) => Promise<unknown>) => {
      state.started += 1;
      try {
        const result = await callback(tx);
        state.committed += 1;
        return result;
      } catch (error) {
        state.rolledBack += 1;
        throw error;
      }
    },
  };

  return { prisma, state };
}

test('update only loads transactions from the authenticated workspace', async () => {
  let findArgs: any;
  let updateCalled = false;
  const { prisma, state } = createTransactionalPrisma({
    transaction: {
      findFirst: async (args: any) => {
        findArgs = args;
        return null;
      },
      update: async () => {
        updateCalled = true;
        throw new Error('update should not run');
      },
    },
  });
  const { service } = createService(prisma);

  await assert.rejects(
    () => service.update('tx-other-workspace', 'org-current', { description: 'blocked', userId: 'user-1' } as any),
    NotFoundException,
  );

  assert.deepEqual(findArgs.where, { id: 'tx-other-workspace', orgId: 'org-current' });
  assert.equal(updateCalled, false);
  assert.equal(state.started, 1);
  assert.equal(state.rolledBack, 1);
});

test('delete only moves transactions from the authenticated workspace to trash', async () => {
  let findArgs: any;
  let updateCalled = false;
  const { prisma, state } = createTransactionalPrisma({
    transaction: {
      findFirst: async (args: any) => {
        findArgs = args;
        return null;
      },
      update: async () => {
        updateCalled = true;
        throw new Error('delete should not run');
      },
    },
  });
  const { service } = createService(prisma);

  await assert.rejects(() => service.delete('tx-other-workspace', 'org-current'), NotFoundException);

  assert.deepEqual(findArgs.where, { id: 'tx-other-workspace', orgId: 'org-current' });
  assert.equal(updateCalled, false);
  assert.equal(state.started, 1);
  assert.equal(state.rolledBack, 1);
});

test('restore only restores transactions from the authenticated workspace', async () => {
  let findArgs: any;
  let updateCalled = false;
  const { prisma, state } = createTransactionalPrisma({
    transaction: {
      findFirst: async (args: any) => {
        findArgs = args;
        return null;
      },
      update: async () => {
        updateCalled = true;
        throw new Error('restore should not run');
      },
    },
  });
  const { service } = createService(prisma);

  await assert.rejects(() => service.restore('tx-other-workspace', 'org-current'), NotFoundException);

  assert.deepEqual(findArgs.where, { id: 'tx-other-workspace', orgId: 'org-current' });
  assert.equal(updateCalled, false);
  assert.equal(state.started, 1);
  assert.equal(state.rolledBack, 1);
});

test('deletePermanent only removes transactions from the authenticated workspace', async () => {
  let findArgs: any;
  let deleteCalled = false;
  const { prisma, state } = createTransactionalPrisma({
    transaction: {
      findFirst: async (args: any) => {
        findArgs = args;
        return null;
      },
      delete: async () => {
        deleteCalled = true;
        throw new Error('delete should not run');
      },
    },
  });
  const { service } = createService(prisma);

  await assert.rejects(() => service.deletePermanent('tx-other-workspace', 'org-current', 'user-1'), NotFoundException);

  assert.deepEqual(findArgs.where, { id: 'tx-other-workspace', orgId: 'org-current' });
  assert.equal(deleteCalled, false);
  assert.equal(state.started, 1);
  assert.equal(state.rolledBack, 1);
});

test('findById only returns transactions from the authenticated workspace', async () => {
  let findArgs: any;
  const expected = { id: 'tx-current-workspace', orgId: 'org-current' };
  const { service } = createService({
    transaction: {
      findFirst: async (args: any) => {
        findArgs = args;
        return expected;
      },
    },
  });

  const result = await service.findById('tx-current-workspace', 'org-current');

  assert.equal(result, expected);
  assert.deepEqual(findArgs.where, { id: 'tx-current-workspace', orgId: 'org-current' });
  assert.deepEqual(findArgs.include, {
    category: true,
    account: true,
    card: true,
  });
});

test('create wraps installments and balance updates in one Prisma transaction', async () => {
  const createdTransactions: any[] = [];
  const accountUpdates: any[] = [];
  const { prisma, state } = createTransactionalPrisma({
    organizationMember: {
      findUnique: async () => ({ id: 'member-1', userId: 'user-1' }),
    },
    account: {
      findFirst: async () => ({ id: 'account-1' }),
      update: async (args: any) => {
        accountUpdates.push(args);
        throw new Error('balance update failed');
      },
    },
    card: {
      findFirst: async () => null,
    },
    transaction: {
      create: async (args: any) => {
        createdTransactions.push(args.data);
        return {
          id: `tx-${createdTransactions.length}`,
          orgId: 'org-current',
          accountId: 'account-1',
          cardId: null,
          type: args.data.type,
          amountInCents: args.data.amountInCents,
          member: { userId: 'user-1' },
        };
      },
    },
  });
  const { service, realtimeCalls } = createService(prisma);

  await assert.rejects(
    () => service.create('org-current', {
      description: 'Parcelado',
      amountInCents: 10000,
      type: TransactionType.EXPENSE,
      categoryId: 'cat-1',
      accountId: 'account-1',
      userId: 'user-1',
      installments: 2,
      paymentMethod: PaymentMethod.ACCOUNT,
    }),
    /balance update failed/,
  );

  assert.equal(state.started, 1);
  assert.equal(state.committed, 0);
  assert.equal(state.rolledBack, 1);
  assert.equal(createdTransactions.length, 2);
  assert.equal(accountUpdates.length, 1);
  assert.deepEqual(realtimeCalls, []);
});

test('create resolves linked card and recalculates card usage inside the transaction', async () => {
  const cardFinds: any[] = [];
  const cardUpdates: any[] = [];
  const { prisma, state } = createTransactionalPrisma({
    organizationMember: {
      findUnique: async () => ({ id: 'member-1', userId: 'user-1' }),
      findFirst: async () => ({ orgId: 'org-personal' }),
    },
    card: {
      findFirst: async (args: any) => {
        cardFinds.push(args.where);
        return args.where.orgId === 'org-personal'
          ? { id: 'card-1', orgId: 'org-personal', cardType: 'CREDIT' }
          : null;
      },
      update: async (args: any) => {
        cardUpdates.push(args);
        return args;
      },
    },
    cardWorkspaceLink: {
      findUnique: async () => ({ linked: true }),
    },
    transaction: {
      create: async (args: any) => ({
        id: 'tx-1',
        orgId: 'org-current',
        accountId: null,
        cardId: 'card-1',
        type: args.data.type,
        amountInCents: args.data.amountInCents,
        member: { userId: 'user-1' },
      }),
      aggregate: async () => ({ _sum: { amountInCents: 3000 } }),
    },
  });
  const { service, realtimeCalls } = createService(prisma);

  await service.create('org-current', {
    description: 'Cartao vinculado',
    amountInCents: 3000,
    type: TransactionType.EXPENSE,
    categoryId: 'cat-1',
    cardId: 'card-1',
    userId: 'user-1',
    paymentMethod: PaymentMethod.CREDIT_CARD,
  });

  assert.equal(state.started, 1);
  assert.equal(state.committed, 1);
  assert.equal(state.rolledBack, 0);
  assert.deepEqual(cardFinds, [
    { id: 'card-1', orgId: 'org-current' },
    { id: 'card-1', orgId: 'org-personal' },
  ]);
  assert.deepEqual(cardUpdates[0].data, { usedInCents: 3000 });
  assert.equal(realtimeCalls.length, 1);
});

test('update rolls back when transaction update fails after reversing balance', async () => {
  const accountUpdates: any[] = [];
  const { prisma, state } = createTransactionalPrisma({
    transaction: {
      findFirst: async () => ({
        id: 'tx-1',
        orgId: 'org-current',
        description: 'Old',
        amountInCents: 5000,
        type: TransactionType.EXPENSE,
        categoryId: 'cat-1',
        accountId: 'account-1',
        cardId: null,
        memberId: 'member-1',
        paymentMethod: PaymentMethod.ACCOUNT,
        note: null,
        member: { userId: 'user-1' },
      }),
      update: async () => {
        throw new Error('transaction update failed');
      },
    },
    account: {
      findFirst: async () => ({ id: 'account-1' }),
      update: async (args: any) => accountUpdates.push(args),
    },
    card: {
      findFirst: async () => null,
    },
  });
  const { service, realtimeCalls } = createService(prisma);

  await assert.rejects(
    () => service.update('tx-1', 'org-current', { amountInCents: 7000, userId: 'user-1' } as any),
    /transaction update failed/,
  );

  assert.equal(state.started, 1);
  assert.equal(state.rolledBack, 1);
  assert.equal(accountUpdates.length, 1);
  assert.deepEqual(realtimeCalls, []);
});

test('delete rolls back when card usage recalculation fails after soft delete', async () => {
  const { prisma, state } = createTransactionalPrisma({
    transaction: {
      findFirst: async () => ({
        id: 'tx-1',
        orgId: 'org-current',
        accountId: null,
        cardId: 'card-1',
        type: TransactionType.EXPENSE,
        amountInCents: 4500,
        deletedAt: null,
      }),
      update: async () => ({
        id: 'tx-1',
        orgId: 'org-current',
        accountId: null,
        cardId: 'card-1',
        type: TransactionType.EXPENSE,
        amountInCents: 4500,
        member: { userId: 'user-1' },
      }),
      aggregate: async () => ({ _sum: { amountInCents: 0 } }),
    },
    card: {
      update: async () => {
        throw new Error('card usage failed');
      },
    },
  });
  const { service, realtimeCalls } = createService(prisma);

  await assert.rejects(() => service.delete('tx-1', 'org-current'), /card usage failed/);

  assert.equal(state.started, 1);
  assert.equal(state.rolledBack, 1);
  assert.deepEqual(realtimeCalls, []);
});

test('restore rolls back when balance restoration fails after transaction restore', async () => {
  const { prisma, state } = createTransactionalPrisma({
    transaction: {
      findFirst: async () => ({
        id: 'tx-1',
        orgId: 'org-current',
        accountId: 'account-1',
        cardId: null,
        type: TransactionType.INCOME,
        amountInCents: 2000,
        deletedAt: new Date(),
      }),
      update: async () => ({
        id: 'tx-1',
        orgId: 'org-current',
        accountId: 'account-1',
        cardId: null,
        type: TransactionType.INCOME,
        amountInCents: 2000,
        member: { userId: 'user-1' },
      }),
    },
    account: {
      update: async () => {
        throw new Error('balance restore failed');
      },
    },
  });
  const { service, realtimeCalls } = createService(prisma);

  await assert.rejects(() => service.restore('tx-1', 'org-current'), /balance restore failed/);

  assert.equal(state.started, 1);
  assert.equal(state.rolledBack, 1);
  assert.deepEqual(realtimeCalls, []);
});

test('deletePermanent rolls back when audit log creation fails after delete', async () => {
  const { prisma, state } = createTransactionalPrisma({
    transaction: {
      findFirst: async () => ({ id: 'tx-1', orgId: 'org-current' }),
      delete: async () => ({
        id: 'tx-1',
        orgId: 'org-current',
        member: { userId: 'user-1' },
      }),
    },
    auditLog: {
      create: async () => {
        throw new Error('audit failed');
      },
    },
  });
  const { service, realtimeCalls } = createService(prisma);

  await assert.rejects(() => service.deletePermanent('tx-1', 'org-current', 'user-1'), /audit failed/);

  assert.equal(state.started, 1);
  assert.equal(state.rolledBack, 1);
  assert.deepEqual(realtimeCalls, []);
});

test('resetTransactions rolls back when card recalculation fails after batch delete', async () => {
  const { prisma, state } = createTransactionalPrisma({
    transaction: {
      findMany: async () => [{
        id: 'tx-1',
        accountId: null,
        cardId: 'card-1',
        type: TransactionType.EXPENSE,
        amountInCents: 9000,
      }],
      updateMany: async () => ({ count: 1 }),
      aggregate: async () => ({ _sum: { amountInCents: 0 } }),
    },
    card: {
      update: async () => {
        throw new Error('reset card usage failed');
      },
    },
    auditLog: {
      create: async () => {
        throw new Error('audit should not run');
      },
    },
  });
  const { service, realtimeCalls } = createService(prisma);

  await assert.rejects(() => service.resetTransactions('org-current', 'user-1', 'all'), /reset card usage failed/);

  assert.equal(state.started, 1);
  assert.equal(state.rolledBack, 1);
  assert.deepEqual(realtimeCalls, []);
});
