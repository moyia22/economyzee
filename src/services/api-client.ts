/**
 * EconomyZee API Client
 *
 * Handles all HTTP communication with the NestJS backend.
 */

import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const API_PREFIX = '';

let accessToken: string | null = null;

export function setToken(token: string) {
  accessToken = token;
  localStorage.setItem('economyzee_token', token);
}

export function getToken(): string | null {
  if (!accessToken) {
    accessToken = localStorage.getItem('economyzee_token');
  }
  return accessToken;
}

export function clearToken() {
  accessToken = null;
  localStorage.removeItem('economyzee_token');
}

export async function autoLogin() {
  if (getToken()) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    setToken(session.access_token);
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.access_token) {
      setToken(session.access_token);
    } else if (!getToken()) {
      clearToken();
    }
  });
}

async function resolveToken() {
  const localToken = getToken();
  if (localToken) return localToken;

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    setToken(session.access_token);
    return session.access_token;
  }

  return null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await resolveToken();

  if (!token) {
    console.warn(`[API] Chamada bloqueada para ${path}: usuario nao autenticado.`);
    throw new Error('Sessao expirada. Por favor, faca login novamente.');
  }

  const orgId = localStorage.getItem('economyzee_org_id');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(orgId ? { 'x-organization-id': orgId } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(`${API_URL}${API_PREFIX}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    console.error(`[API] 401 Unauthorized em ${path}. Token expirado ou invalido.`);
  }

  if (!response.ok) {
    const error = await response.json().catch(async () => ({
      message: (await response.text().catch(() => response.statusText)) || response.statusText,
    }));
    throw new Error(error.message || `Erro ${response.status}`);
  }

  return response.json();
}

async function publicRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(`${API_URL}${API_PREFIX}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(async () => ({
      message: (await response.text().catch(() => response.statusText)) || response.statusText,
    }));
    throw new Error(error.message || `Erro ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export const publicApi = {
  get: <T>(path: string) => publicRequest<T>(path),
  post: <T>(path: string, body?: unknown) => publicRequest<T>(path, { method: 'POST', body: JSON.stringify(body) }),
};
