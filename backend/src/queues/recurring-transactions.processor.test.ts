import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { PaymentMethod, TransactionOrigin, TransactionStatus, TransactionType } from '@prisma/client';
import { RecurringTransactionsProcessor } from './recurring-transactions.processor';

type State = {
  recurring: any[];
  transactions: any[];
  accounts: any[];
  cards: any[];
  auditLogs: any[];
  categories: any[];
  members: any[];
};

function cloneDate(value: Date | string | null | undefined) {
  return value ? new Date(value) : value;
}

function cloneState(state: State): State {
  return {
    recurring: state.recurring.map((item) => ({
      ...item,
      nextOccurrence: cloneDate(item.nextOccurrence),
      lastOccurrence: cloneDate(item.lastOccurrence),
    })),
    transactions: state.transactions.map((item) => ({
      ...item,
      date: cloneDate(item.date),
      deletedAt: cloneDate(item.deletedAt),
    })),
    accounts: state.accounts.map((item) => ({ ...item })),
    cards: state.cards.map((item) => ({ ...item })),
    auditLogs: state.auditLogs.map((item) => ({ ...item })),
    categories: state.categories.map((item) => ({ ...item })),
    members: state.members.map((item) => ({ ...item })),
  };
}

function baseState(overrides: Partial<State> = {}): State {
  return {
    recurring: [],
    transactions: [],
    accounts: [{ id: 'account-1', balance: 10_000 }],
    cards: [{ id: 'card-1', usedInCents: 0 }],
    auditLogs: [],
    categories: [{ id: 'category-1', name: 'General' }],
    members: [{ id: 'member-1', userId: 'user-1', orgId: 'org-1' }],
    ...overrides,
  };
}

function recurring(overrides: any = {}) {
  return {
    id: 'recurring-1',
    description: 'Recurring expense',
    amountInCents: 1_500,
    type: TransactionType.EXPENSE,
    paymentMethod: null,
    frequency: 'DAILY',
    dayOfMonth: null,
    dayOfWeek: null,
    lastOccurrence: null,
    nextOccurrence: new Date('2026-06-06T10:00:00.000Z'),
    active: true,
    categoryId: 'category-1',
    accountId: 'account-1',
    cardId: null,
    memberId: 'member-1',
    orgId: 'org-1',
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createPrismaMock(seed: State, options: { failAudit?: boolean } = {}) {
  let state = cloneState(seed);
  let transactionSeq = 1;

  const makeClient = (target: State) => ({
    recurringTransaction: {
      findMany: async ({ where }: any) =>
        target.recurring
          .filter((item) => item.active === where.active)
          .filter((item) => item.nextOccurrence <= where.nextOccurrence.lte)
          .map((item) => ({
            ...item,
            member: target.members.find((member) => member.id === item.memberId),
          })),
      updateMany: async ({ where, data }: any) => {
        const item = target.recurring.find(
          (candidate) =>
            candidate.id === where.id &&
            candidate.active === where.active &&
            candidate.nextOccurrence.getTime() === where.nextOccurrence.getTime(),
        );

        if (!item) return { count: 0 };
        Object.assign(item, data);
        return { count: 1 };
      },
    },
    transaction: {
      create: async ({ data, include }: any) => {
        const transaction = {
          id: `tx-${transactionSeq++}`,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };

        target.transactions.push(transaction);

        if (!include) return transaction;
        return {
          ...transaction,
          category: target.categories.find((category) => category.id === transaction.categoryId) ?? null,
          account: target.accounts.find((account) => account.id === transaction.accountId) ?? null,
          card: target.cards.find((card) => card.id === transaction.cardId) ?? null,
          member: target.members.find((member) => member.id === transaction.memberId),
        };
      },
      aggregate: async ({ where }: any) => {
        const sum = target.transactions
          .filter((transaction) => transaction.cardId === where.cardId)
          .filter((transaction) => transaction.deletedAt === null)
          .filter((transaction) => transaction.type === where.type)
          .filter((transaction) => transaction.date >= where.date.gte && transaction.date <= where.date.lte)
          .reduce((total, transaction) => total + transaction.amountInCents, 0);

        return { _sum: { amountInCents: sum } };
      },
    },
    account: {
      update: async ({ where, data }: any) => {
        const account = target.accounts.find((item) => item.id === where.id);
        if (!account) throw new Error('account not found');
        account.balance += data.balance.increment;
        return account;
      },
    },
    card: {
      update: async ({ where, data }: any) => {
        const card = target.cards.find((item) => item.id === where.id);
        if (!card) throw new Error('card not found');
        Object.assign(card, data);
        return card;
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        if (options.failAudit) throw new Error('audit failed');
        const audit = { id: `audit-${target.auditLogs.length + 1}`, ...data };
        target.auditLogs.push(audit);
        return audit;
      },
    },
  });

  const prisma: any = makeClient(state);
  prisma.__state = () => state;
  prisma.$transaction = async (callback: any) => {
    const draft = cloneState(state);
    const tx = makeClient(draft);

    const result = await callback(tx);
    state = draft;
    return result;
  };

  return prisma;
}

function createProcessor(state: State, options?: { failAudit?: boolean }) {
  const realtimeCalls: any[] = [];
  const realtime = {
    sendToUser: (...args: any[]) => realtimeCalls.push(args),
  };
  const prisma = createPrismaMock(state, options);
  const processor = new RecurringTransactionsProcessor(prisma, realtime as any);

  return { processor, prisma, realtimeCalls };
}

test('recurring processor is registered with its Bull queue and scheduler', () => {
  const queuesModule = readFileSync(resolve(process.cwd(), 'src/queues/queues.module.ts'), 'utf8');
  const scheduler = readFileSync(resolve(process.cwd(), 'src/queues/recurring-transactions.scheduler.ts'), 'utf8');

  assert.equal(queuesModule.includes("{ name: 'recurring-transactions' }"), true);
  assert.equal(queuesModule.includes('RecurringTransactionsProcessor'), true);
  assert.equal(queuesModule.includes('RecurringTransactionsScheduler'), true);
  assert.equal(scheduler.includes("@InjectQueue('recurring-transactions')"), true);
  assert.equal(scheduler.includes("'process-daily'"), true);
  assert.equal(scheduler.includes("repeat: { cron: '0 * * * *' }"), true);
});

test('processes a daily recurring transaction and updates account, audit and realtime', async () => {
  const { processor, prisma, realtimeCalls } = createProcessor(
    baseState({ recurring: [recurring({ frequency: 'DAILY' })] }),
  );

  const result = await processor.processRecurring({ data: { now: '2026-06-06T12:00:00.000Z' } } as any);
  const state = prisma.__state();

  assert.deepEqual(result, { processed: 1, succeeded: 1, failed: 0, skipped: 0 });
  assert.equal(state.transactions.length, 1);
  assert.equal(state.transactions[0].origin, TransactionOrigin.RECURRING);
  assert.equal(state.transactions[0].status, TransactionStatus.CONFIRMED);
  assert.equal(state.accounts[0].balance, 8_500);
  assert.equal(state.recurring[0].lastOccurrence.toISOString(), '2026-06-06T10:00:00.000Z');
  assert.equal(state.recurring[0].nextOccurrence.toISOString(), '2026-06-07T10:00:00.000Z');
  assert.equal(state.auditLogs.length, 1);
  assert.equal(state.auditLogs[0].action, 'RECURRING_TRANSACTION_PROCESSED');
  assert.equal(realtimeCalls.length, 1);
  assert.equal(realtimeCalls[0][0], 'user-1');
  assert.equal(realtimeCalls[0][1], 'transaction_created');
  assert.equal(realtimeCalls[0][2].orgId, 'org-1');
});

test('processes a weekly recurring income and advances next occurrence by one week', async () => {
  const { processor, prisma } = createProcessor(
    baseState({
      recurring: [
        recurring({
          description: 'Weekly income',
          type: TransactionType.INCOME,
          amountInCents: 2_000,
          frequency: 'WEEKLY',
        }),
      ],
    }),
  );

  await processor.processRecurring({ data: { now: '2026-06-06T12:00:00.000Z' } } as any);
  const state = prisma.__state();

  assert.equal(state.transactions[0].type, TransactionType.INCOME);
  assert.equal(state.accounts[0].balance, 12_000);
  assert.equal(state.recurring[0].nextOccurrence.toISOString(), '2026-06-13T10:00:00.000Z');
});

test('processes a monthly card recurring transaction and recalculates card usage', async () => {
  const { processor, prisma, realtimeCalls } = createProcessor(
    baseState({
      recurring: [
        recurring({
          description: 'Monthly card expense',
          accountId: null,
          cardId: 'card-1',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          frequency: 'MONTHLY',
        }),
      ],
    }),
  );

  await processor.processRecurring({ data: { now: '2026-06-06T12:00:00.000Z' } } as any);
  const state = prisma.__state();

  assert.equal(state.transactions.length, 1);
  assert.equal(state.transactions[0].cardId, 'card-1');
  assert.equal(state.transactions[0].paymentMethod, PaymentMethod.CREDIT_CARD);
  assert.equal(state.accounts[0].balance, 10_000);
  assert.equal(state.cards[0].usedInCents, 1_500);
  assert.equal(state.recurring[0].nextOccurrence.toISOString(), '2026-07-06T10:00:00.000Z');
  assert.equal(state.auditLogs.length, 1);
  assert.equal(realtimeCalls.length, 1);
});

test('rolls back transaction, financial effects and recurrence advance when audit fails', async () => {
  const originalRecurring = recurring({ frequency: 'DAILY' });
  const { processor, prisma, realtimeCalls } = createProcessor(
    baseState({ recurring: [originalRecurring] }),
    { failAudit: true },
  );

  const result = await processor.processRecurring({ data: { now: '2026-06-06T12:00:00.000Z' } } as any);
  const state = prisma.__state();

  assert.deepEqual(result, { processed: 1, succeeded: 0, failed: 1, skipped: 0 });
  assert.equal(state.transactions.length, 0);
  assert.equal(state.accounts[0].balance, 10_000);
  assert.equal(state.auditLogs.length, 0);
  assert.equal(state.recurring[0].lastOccurrence, null);
  assert.equal(state.recurring[0].nextOccurrence.toISOString(), originalRecurring.nextOccurrence.toISOString());
  assert.equal(realtimeCalls.length, 0);
});
