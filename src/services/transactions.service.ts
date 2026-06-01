import { api } from './api-client';

export interface TransactionFilters {
  search?: string;
  category?: string;
  account?: string;
  origin?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export async function getTransactions(filters?: TransactionFilters) {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.category && filters.category !== 'all') params.set('category', filters.category);
  if (filters?.account && filters.account !== 'all') params.set('account', filters.account);
  if (filters?.origin && filters.origin !== 'all') params.set('origin', filters.origin);
  if (filters?.type) params.set('type', filters.type);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));
  
  const qs = params.toString();
  return api.get<any>(`/transactions${qs ? '?' + qs : ''}`);
}

export async function createTransaction(data: any) {
  return api.post('/transactions', data);
}

export async function updateTransaction(id: string, data: any) {
  return api.patch(`/transactions/${id}`, data);
}

export async function deleteTransaction(id: string) {
  return api.delete(`/transactions/${id}`);
}

export async function resetTransactions(period: 'day' | 'week' | 'month' | 'all') {
  return api.post(`/transactions/reset/${period}`, {});
}

export async function getTrash() {
  return api.get<any>('/transactions/trash');
}

export async function restoreTransaction(id: string) {
  return api.post(`/transactions/${id}/restore`, {});
}

export async function restoreAllTrash() {
  return api.post('/transactions/trash/restore-all', {});
}

export async function deletePermanentTransaction(id: string) {
  return api.delete(`/transactions/${id}/permanent`);
}
