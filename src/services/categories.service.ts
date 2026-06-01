import { api } from "./api-client";

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  active: boolean;
  orgId: string;
  createdAt: string;
  updatedAt: string;
}

export async function getCategories(): Promise<Category[]> {
  return await api.get<Category[]>("/categories");
}

export async function createCategory(data: { name: string; icon?: string; color?: string }): Promise<Category> {
  return await api.post<Category>("/categories", data);
}

export async function restoreDefaultCategories(): Promise<Category[]> {
  return await api.post<Category[]>("/categories/defaults", {});
}

export async function updateCategory(id: string, data: { name?: string; icon?: string; color?: string; active?: boolean }): Promise<Category> {
  return await api.patch<Category>(`/categories/${id}`, data);
}

export async function deleteCategory(id: string): Promise<void> {
  return await api.delete<void>(`/categories/${id}`);
}
