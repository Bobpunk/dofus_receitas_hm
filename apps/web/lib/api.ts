import type { DropSource, ItemMin, RecipeMin } from './types';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`);
  if (res.status === 404) return null as T;
  if (!res.ok) throw new Error(`Falha na requisição (${res.status})`);
  const text = await res.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

export const api = {
  searchItems: (q: string, limit = 50) =>
    get<ItemMin[]>(`/items/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  getItem: (id: number) => get<ItemMin>(`/items/${id}`),
  byIds: (ids: number[]) =>
    get<ItemMin[]>(`/items/by-ids?ids=${ids.filter((n) => Number.isFinite(n)).join(',')}`),
  searchRecipes: (q: string, limit = 50) =>
    get<RecipeMin[]>(`/recipes/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  recipes: () => get<RecipeMin[]>(`/recipes`),
  recipeIds: () => get<number[]>(`/recipes/ids`),
  getRecipe: (resultId: number) => get<RecipeMin>(`/recipes/${resultId}`),
  jobs: () => get<any[]>(`/jobs`),
  characteristics: () => get<Record<number, string>>(`/characteristics`),
  runes: () => get<Record<string, { id: number; name: string; img: string | null }>>(`/runes`),
  prices: () => get<Record<number, number>>(`/prices`),
  drops: () => get<Record<number, DropSource[]>>(`/drops`),
  dropsForItem: (id: number) => get<DropSource[]>(`/drops/${id}`),
};
