import { api } from './api-client';

export async function getCards() {
  return api.get<any[]>('/cards');
}

export async function createCard(data: any) {
  return api.post('/cards', data);
}

export async function updateCard(id: string, data: any) {
  return api.patch(`/cards/${id}`, data);
}

export async function deleteCard(id: string) {
  return api.delete(`/cards/${id}`);
}

export async function getCardInvoices(cardId: string) {
  return api.get<any[]>(`/cards/${cardId}/invoices`);
}

export interface CardLinkItem {
  id: string;
  name: string;
  last4: string;
  brand: string;
  color: string;
  linked: boolean;
}

export interface CardLinkState {
  isPersonalContext: boolean;
  autoLink: boolean;
  cards: CardLinkItem[];
}

export async function getCardLinks() {
  return api.get<CardLinkState>('/cards/links');
}

export async function setAutoLinkDefault(enabled: boolean) {
  return api.put<CardLinkState>('/cards/links/auto', { enabled });
}

export async function setCardLink(cardId: string, linked: boolean) {
  return api.put<CardLinkState>(`/cards/links/${cardId}`, { linked });
}
