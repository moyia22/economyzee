import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { BudgetsService } from './budgets/budgets.service';
import { BillsService } from './bills/bills.service';
import { CategoriesService } from './categories/categories.service';
import { CardsService } from './cards/cards.service';

// Regressão de IDOR entre workspaces: update/delete/leitura por id DEVEM ser
// barrados quando a entidade nao pertence ao orgId autenticado.

test('BudgetsService.update rejects a budget from another workspace', async () => {
  let writeCalled = false;
  const prisma: any = {
    budget: {
      findFirst: async (args: any) => {
        assert.deepEqual(args.where, { id: 'budget-x', orgId: 'org-current' });
        return null; // pertence a outra org
      },
      update: async () => {
        writeCalled = true;
        return {};
      },
    },
  };
  const svc = new BudgetsService(prisma);
  await assert.rejects(() => svc.update('budget-x', 'org-current', { limitInCents: 1 }), NotFoundException);
  assert.equal(writeCalled, false);
});

test('BudgetsService.delete rejects a budget from another workspace', async () => {
  let deleteCalled = false;
  const prisma: any = {
    budget: {
      findFirst: async () => null,
      delete: async () => {
        deleteCalled = true;
        return {};
      },
    },
  };
  const svc = new BudgetsService(prisma);
  await assert.rejects(() => svc.delete('budget-x', 'org-current'), NotFoundException);
  assert.equal(deleteCalled, false);
});

test('BillsService.markPaid/update/delete reject bills from another workspace', async () => {
  const calls: string[] = [];
  const prisma: any = {
    bill: {
      findFirst: async () => null,
      update: async () => {
        calls.push('update');
        return {};
      },
      delete: async () => {
        calls.push('delete');
        return {};
      },
    },
  };
  const svc = new BillsService(prisma);
  await assert.rejects(() => svc.markPaid('bill-x', 'org-current'), NotFoundException);
  await assert.rejects(() => svc.update('bill-x', 'org-current', { name: 'x' }), NotFoundException);
  await assert.rejects(() => svc.delete('bill-x', 'org-current'), NotFoundException);
  assert.deepEqual(calls, []);
});

test('CategoriesService.update/delete reject categories from another workspace', async () => {
  const calls: string[] = [];
  const prisma: any = {
    category: {
      findFirst: async (args: any) => {
        assert.deepEqual(args.where, { id: 'cat-x', orgId: 'org-current' });
        return null;
      },
      update: async () => {
        calls.push('update');
        return {};
      },
      delete: async () => {
        calls.push('delete');
        return {};
      },
    },
  };
  const svc = new CategoriesService(prisma);
  await assert.rejects(() => svc.update('cat-x', 'org-current', { name: 'x' }), NotFoundException);
  await assert.rejects(() => svc.delete('cat-x', 'org-current'), NotFoundException);
  assert.deepEqual(calls, []);
});

test('CardsService.getInvoices rejects a card from another workspace (no personal link)', async () => {
  let invoiceQueried = false;
  const prisma: any = {
    card: {
      findUnique: async () => ({ id: 'card-x', orgId: 'org-other' }),
    },
    organizationMember: {
      findFirst: async () => ({ orgId: 'org-personal' }), // org pessoal != org do cartao
    },
    transaction: {
      findMany: async () => {
        invoiceQueried = true;
        return [];
      },
    },
  };
  const svc = new CardsService(prisma);
  await assert.rejects(() => svc.getInvoices('card-x', 'org-current', 'user-1'), NotFoundException);
  assert.equal(invoiceQueried, false);
});

test('CardsService.getInvoices allows a card owned by the active workspace', async () => {
  let invoiceQueried = false;
  const prisma: any = {
    card: {
      findUnique: async () => ({ id: 'card-1', orgId: 'org-current' }),
    },
    transaction: {
      findMany: async () => {
        invoiceQueried = true;
        return [{ id: 'tx-1' }];
      },
    },
  };
  const svc = new CardsService(prisma);
  const result = await svc.getInvoices('card-1', 'org-current', 'user-1');
  assert.equal(invoiceQueried, true);
  assert.equal(result.length, 1);
});
