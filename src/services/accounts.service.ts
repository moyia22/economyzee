import { api } from './api-client';

export async function getAccounts() {
  return api.get<any[]>('/accounts');
}

export async function createAccount(data: any) {
  return api.post('/accounts', data);
}

export async function updateAccount(id: string, data: any) {
  return api.patch(`/accounts/${id}`, data);
}

export async function deleteAccount(id: string) {
  return api.delete(`/accounts/${id}`);
}
