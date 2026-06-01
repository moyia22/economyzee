import { api } from './api-client';

export async function getAnalyticsSummary() {
  return api.get<any>('/analytics/summary');
}

export async function getMonthlyEvolution() {
  return api.get<any[]>('/analytics/monthly-evolution');
}

export async function getCategoryBreakdown() {
  return api.get<any[]>('/analytics/category-breakdown');
}

export async function getTopExpenses(limit = 10) {
  return api.get<any[]>(`/analytics/top-expenses?limit=${limit}`);
}

export async function getMemberSpending() {
  return api.get<any[]>('/analytics/member-spending');
}

export async function getAnalytics() {
  const [evolutionReq, breakdownReq, topExpensesReq] = await Promise.all([
    getMonthlyEvolution().catch(() => []),
    getCategoryBreakdown().catch(() => []),
    getTopExpenses(8).catch(() => [])
  ]);

  return {
    evolution: evolutionReq || [],
    breakdown: breakdownReq || [],
    topExpenses: topExpensesReq || []
  };
}
