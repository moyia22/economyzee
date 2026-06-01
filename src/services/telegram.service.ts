import { api } from './api-client';

export interface TelegramStatus {
  linked: boolean;
  telegramUsername: string | null;
  telegramFirstName: string | null;
  telegramLinkedAt: string | null;
  telegramLastSeenAt: string | null;
  botUsername: string;
}

export interface LinkTokenResponse {
  token: string;
  expiresAt: string;
  deepLink: string;
}

export async function getTelegramStatus() {
  return api.get<TelegramStatus>('/integrations/telegram/status');
}

export async function getBotStatus() {
  return api.get<any>('/integrations/telegram/bot-status');
}

export async function generateLinkToken() {
  return api.post<LinkTokenResponse>('/integrations/telegram/link-token', {});
}

export async function unlinkTelegram() {
  return api.delete('/integrations/telegram/unlink');
}

