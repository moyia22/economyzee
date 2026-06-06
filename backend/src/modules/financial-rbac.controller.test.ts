import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ROLES_KEY, WRITE_ROLES } from '../common';
import { AccountsController } from './accounts/accounts.controller';
import { BillsController } from './bills/bills.controller';
import { BudgetsController } from './budgets/budgets.controller';
import { CardsController } from './cards/cards.controller';
import { CategoriesController } from './categories/categories.controller';
import { DashboardController } from './dashboard/dashboard.controller';
import { TransactionsController } from './transactions/transactions.controller';

const expectedWriteRoles = [...WRITE_ROLES];

const protectedWriteMethods = [
  [TransactionsController, ['create', 'update', 'restoreAllTrash', 'resetTransactions', 'restore', 'deletePermanent', 'delete']],
  [CategoriesController, ['create', 'restoreDefaults', 'update', 'delete']],
  [AccountsController, ['create', 'update', 'delete']],
  [BudgetsController, ['create', 'update', 'delete']],
  [BillsController, ['create', 'markPaid', 'update', 'delete']],
  [CardsController, ['setAutoLink', 'setCardLink', 'create', 'update', 'delete']],
  [DashboardController, ['createSmartAlert', 'deleteSmartAlert']],
] as const;

const readOnlyMethods = [
  [TransactionsController, ['findAll', 'getTrash']],
  [CategoriesController, ['findAll']],
  [AccountsController, ['findAll']],
  [BudgetsController, ['findAll']],
  [BillsController, ['findAll']],
  [CardsController, ['findAll', 'getLinks', 'getInvoices']],
  [DashboardController, ['summary', 'telegramFeed', 'smartAlerts', 'customAlerts']],
] as const;

test('financial write routes require OWNER, ADMIN or MEMBER roles', () => {
  for (const [controller, methods] of protectedWriteMethods) {
    for (const method of methods) {
      const metadata = Reflect.getMetadata(ROLES_KEY, controller.prototype[method]);
      assert.deepEqual(metadata, expectedWriteRoles, `${controller.name}.${method} must require write roles`);
    }
  }
});

test('financial read routes remain readable without write role metadata', () => {
  for (const [controller, methods] of readOnlyMethods) {
    for (const method of methods) {
      const metadata = Reflect.getMetadata(ROLES_KEY, controller.prototype[method]);
      assert.equal(metadata, undefined, `${controller.name}.${method} must remain read-only accessible`);
    }
  }
});
