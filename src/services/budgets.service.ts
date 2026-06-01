import { api } from './api-client';

export async function getBudgets() {
  return api.get<any[]>('/budgets');
}

export async function createBudget(data: any) {
  return api.post('/budgets', data);
}

export async function updateBudget(id: string, data: any) {
  return api.patch(`/budgets/${id}`, data);
}

export async function deleteBudget(id: string) {
  return api.delete(`/budgets/${id}`);
}
