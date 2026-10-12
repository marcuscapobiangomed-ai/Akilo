/**
 * foodDB.ts
 * Gerenciamento de cache local para alimentos frequentes e favoritos (Busca Híbrida).
 * Evita carregar 5.668 itens brutos da TBCA no AsyncStorage do celular, mantendo a busca instantânea.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const FOOD_DB_KEY = '@akilo_fooddb_frequent';
const FOOD_DB_TS_KEY = '@akilo_fooddb_ts';
const REFRESH_INTERVAL = 12 * 60 * 60 * 1000; // Atualiza a cada 12 horas

export interface CachedFood {
  id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g?: number;
  sodium_mg?: number;
  base_qty: number;
  unit_type: string;
  source: 'master' | 'custom';
  user_id?: string;
  is_custom?: boolean;
}

// Pré-carrega os alimentos mais consumidos e favoritos do usuário para acesso offline instantâneo
export const refreshFoodDB = async (): Promise<boolean> => {
  try {
    const [recentRes, favRes] = await Promise.all([
      api.get('/api/food/recent', { limit: 30 }),
      api.get('/api/food/favorites'),
    ]);

    const frequentFoods: CachedFood[] = [];
    const seen = new Set<string>();

    for (const f of [...(favRes || []), ...(recentRes || [])]) {
      if (f?.id && !seen.has(f.id)) {
        seen.add(f.id);
        frequentFoods.push({
          id: f.id,
          name: f.name,
          calories: f.calories || 0,
          protein_g: f.protein_g || 0,
          carbs_g: f.carbs_g || 0,
          fats_g: f.fats_g || 0,
          fiber_g: f.fiber_g || 0,
          sodium_mg: f.sodium_mg || 0,
          base_qty: f.base_qty || 100,
          unit_type: f.unit_type || 'g',
          source: f.is_custom ? 'custom' : 'master',
          is_custom: Boolean(f.is_custom),
        });
      }
    }

    await AsyncStorage.setItem(FOOD_DB_KEY, JSON.stringify(frequentFoods));
    await AsyncStorage.setItem(FOOD_DB_TS_KEY, String(Date.now()));
    console.log(`[FoodDB] Cache local otimizado com ${frequentFoods.length} alimentos frequentes`);
    return true;
  } catch (e) {
    console.warn('[FoodDB] Falha ao atualizar cache frequente:', e);
    return false;
  }
};

export const ensureFoodDB = async () => {
  try {
    const ts = await AsyncStorage.getItem(FOOD_DB_TS_KEY);
    if (!ts || Date.now() - parseInt(ts) > REFRESH_INTERVAL) {
      await refreshFoodDB();
    }
  } catch {
    // Falha silenciosa com fallback online
  }
};

// Busca nos alimentos frequentes salvos localmente
export const searchFoodsLocal = async (query: string): Promise<CachedFood[]> => {
  try {
    const raw = await AsyncStorage.getItem(FOOD_DB_KEY);
    if (!raw) return [];
    const foods: CachedFood[] = JSON.parse(raw);
    if (!query.trim()) return foods.slice(0, 30);
    const q = query.toLowerCase();
    return foods.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 30);
  } catch {
    return [];
  }
};

export const getFoodDBSize = async (): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem(FOOD_DB_KEY);
    if (!raw) return 0;
    return JSON.parse(raw).length;
  } catch {
    return 0;
  }
};
