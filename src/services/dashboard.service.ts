import { api } from './api-client';

export async function getDashboardSummary(period?: string) {
  const qs = period ? `?period=${period}` : '';
  return api.get<any>(`/dashboard/summary${qs}`);
}

export async function getTelegramFeed() {
  return api.get<any[]>('/dashboard/telegram-feed');
}

export async function getSmartAlerts() {
  return api.get<any[]>('/dashboard/smart-alerts');
}

export async function getCustomSmartAlerts() {
  return api.get<any[]>('/dashboard/custom-alerts');
}

export async function createSmartAlert(prompt: string) {
  return api.post<any>('/dashboard/smart-alerts', { prompt });
}

export async function deleteSmartAlert(id: string) {
  return api.delete<{ success: boolean }>(`/dashboard/smart-alerts/${id}`);
}
