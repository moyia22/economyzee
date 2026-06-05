import { api, getToken, setToken } from './api-client';

export async function getReportPreview() {
  return api.get<any>('/reports/preview');
}

export async function getReports() {
  return api.get<any[]>('/reports');
}

export type ReportFormat = 'pdf' | 'csv' | 'xls';

export async function generateReport(type: string, format: ReportFormat): Promise<Blob | null> {
  const API_URL = import.meta.env.VITE_API_URL || '/api';
  try {
    let token = getToken();
    if (!token) {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      token = session?.access_token || null;
      if (token) setToken(token);
    }
    const orgId = localStorage.getItem('economyzee_org_id');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (orgId) headers['x-organization-id'] = orgId;
    const res = await fetch(`${API_URL}/reports/generate?type=${type}&format=${format}`, {
      headers,
    });
    if (!res.ok) return null;
    return res.blob();
  } catch {
    return null;
  }
}
