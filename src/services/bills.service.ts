import { api } from './api-client';

export async function getBills() {
  return api.get<any[]>('/bills');
}

export async function createBill(data: any) {
  return api.post('/bills', data);
}

export async function updateBill(id: string, data: any) {
  return api.patch(`/bills/${id}`, data);
}

export async function deleteBill(id: string) {
  return api.delete(`/bills/${id}`);
}

export async function markBillPaid(id: string) {
  return api.post(`/bills/${id}/mark-paid`);
}
