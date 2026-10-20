/**
 * api.ts
 * Camada de dados direta com Supabase PostgreSQL + RLS e Resiliência Offline.
 * Elimina 100% da necessidade de servidor intermediário (Custo R$ 0, sem cold-start).
 */

import { supabase } from './supabase';
import { cacheGet, cacheSet, cacheInvalidate, buildCacheKey, enqueue } from './cache';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dataEvents } from './dataEvents';
import { evaluateCheckinDue } from './domain/checkinEngine';

const DEFAULT_TARGETS = {
  calories_target: 2000,
  protein_g_target: 140,
  protein_target_g: 140,
  carbs_g_target: 250,
  carbs_target_g: 250,
  fats_g_target: 60,
  fats_target_g: 60,
  saturated_fats_target_g: 20,
  fiber_g_target: 28,
  fiber_target_g: 28,
  water_target_ml: 2500,
  weekly_workouts_target: 4,
};

// Checagem rápida de conectividade
const checkOnline = async (): Promise<boolean> => {
  try {
    const state = await NetInfo.fetch();
    return !!(state.isConnected && state.isInternetReachable !== false);
  } catch {
    return true; // Se falhar a checagem, tenta rede
  }
};

const INVALIDATION_MAP: Record<string, string[]> = {
  '/api/food/log': ['/api/food/log', '/api/analytics/daily', '/api/analytics/weekly', '/api/food/recent'],
  '/api/food/repeat-meal': ['/api/food/log', '/api/analytics/daily', '/api/analytics/weekly', '/api/food/recent'],
  '/api/water/': ['/api/water/', '/api/analytics/daily', '/api/analytics/weekly'],
  '/api/weight/': ['/api/weight/', '/api/analytics/daily', '/api/analytics/weekly', '/api/checkin/status'],
  '/api/exercises/': ['/api/exercises/log', '/api/analytics/daily', '/api/analytics/weekly'],
  '/api/food/favorites': ['/api/food/favorites'],
  '/api/food/custom': ['/api/food/custom', '/api/food/search'],
  '/api/groups/': ['/api/groups/my', '/api/groups/leaderboard'],
  '/api/profile/': ['/api/profile/', '/api/analytics/daily', '/api/checkin/status', '/api/checkin/comparison'],
  '/api/profile/targets': ['/api/profile/targets', '/api/analytics/daily', '/api/analytics/weekly'],
  '/api/checkin/': ['/api/checkin/status', '/api/checkin/comparison', '/api/checkin/history', '/api/profile/', '/api/weight/', '/api/analytics/daily', '/api/analytics/weekly', '/api/groups/leaderboard'],
};

const EVENT_MAP: Record<string, string[]> = {
  '/api/food/log': ['food_logged'],
  '/api/food/repeat-meal': ['food_logged'],
  '/api/water/': ['water_logged'],
  '/api/weight/': ['weight_logged'],
  '/api/exercises/': ['exercise_logged'],
  '/api/food/custom': ['food_logged'],
  '/api/food/favorites': ['food_logged'],
  '/api/groups/': ['group_updated'],
  '/api/profile/': ['profile_updated'],
  '/api/profile/targets': ['targets_updated'],
  '/api/checkin/skip': ['checkin_skipped'],
  '/api/checkin/log': ['checkin_logged', 'weight_logged', 'profile_updated'],
  '/api/checkin/record': ['checkin_logged', 'weight_logged', 'profile_updated'],
};

const emitEvents = (endpoint: string, method: string) => {
  if (endpoint.startsWith('/api/food/log/') && method === 'DELETE') {
    dataEvents.emit('food_deleted');
    return;
  }
  if (endpoint.startsWith('/api/food/log/') && method === 'PUT') {
    dataEvents.emit('food_edited');
    return;
  }
  for (const [prefix, events] of Object.entries(EVENT_MAP)) {
    if (endpoint.startsWith(prefix)) {
      events.forEach((e) => dataEvents.emit(e as any));
      return;
    }
  }
};

const getInvalidationKeys = (endpoint: string): string[] => {
  for (const [prefix, keys] of Object.entries(INVALIDATION_MAP)) {
    if (endpoint.startsWith(prefix)) return keys;
  }
  return [];
};

// Executa requisições de forma direta no Supabase com suporte a RLS
async function executeSupabaseGet(endpoint: string, params?: any): Promise<any> {
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Perfil
  if (endpoint === '/api/profile/') {
    if (!user) return {};
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    let profileData: any = data || {};
    try {
      const [
        localMascot, localSex, localWaist, localFat, localMuscle, localWater,
        localBasal, localMetaAge, localBirth, localWeight, localInitWeight,
        localInitFat, localInitMuscle, localInitWaist, localInitDate, localCustom
      ] = await Promise.all([
        AsyncStorage.getItem(`avatar_mascot_${user.id}`),
        AsyncStorage.getItem(`bio_sex_${user.id}`),
        AsyncStorage.getItem(`bio_waist_${user.id}`),
        AsyncStorage.getItem(`bio_fat_${user.id}`),
        AsyncStorage.getItem(`bio_muscle_${user.id}`),
        AsyncStorage.getItem(`bio_water_${user.id}`),
        AsyncStorage.getItem(`bio_basal_${user.id}`),
        AsyncStorage.getItem(`bio_meta_age_${user.id}`),
        AsyncStorage.getItem(`birth_date_${user.id}`),
        AsyncStorage.getItem(`bio_weight_${user.id}`),
        AsyncStorage.getItem(`bio_init_weight_${user.id}`),
        AsyncStorage.getItem(`bio_init_fat_${user.id}`),
        AsyncStorage.getItem(`bio_init_muscle_${user.id}`),
        AsyncStorage.getItem(`bio_init_waist_${user.id}`),
        AsyncStorage.getItem(`bio_init_date_${user.id}`),
        AsyncStorage.getItem(`avatar_custom_${user.id}`),
      ]);
      if (localMascot && !profileData.avatar_mascot_id) profileData.avatar_mascot_id = localMascot;
      if (localSex && !profileData.sex) profileData.sex = localSex;
      if (localWaist && (profileData.waist_cm === undefined || profileData.waist_cm === null)) profileData.waist_cm = parseFloat(localWaist);
      if (localFat && (profileData.body_fat_pct === undefined || profileData.body_fat_pct === null)) profileData.body_fat_pct = parseFloat(localFat);
      if (localMuscle && (profileData.muscle_mass_pct === undefined || profileData.muscle_mass_pct === null)) profileData.muscle_mass_pct = parseFloat(localMuscle);
      if (localWater && (profileData.body_water_pct === undefined || profileData.body_water_pct === null)) profileData.body_water_pct = parseFloat(localWater);
      if (localBasal && (profileData.basal_metabolism_kcal === undefined || profileData.basal_metabolism_kcal === null)) profileData.basal_metabolism_kcal = parseInt(localBasal, 10);
      if (localMetaAge && (profileData.metabolic_age === undefined || profileData.metabolic_age === null)) profileData.metabolic_age = parseInt(localMetaAge, 10);
      if (localBirth && !profileData.birth_date) profileData.birth_date = localBirth;
      if (localWeight && (profileData.weight_kg === undefined || profileData.weight_kg === null)) profileData.weight_kg = parseFloat(localWeight);
      if (localInitWeight && (profileData.initial_weight_kg === undefined || profileData.initial_weight_kg === null)) profileData.initial_weight_kg = parseFloat(localInitWeight);
      if (localInitFat && (profileData.initial_body_fat_pct === undefined || profileData.initial_body_fat_pct === null)) profileData.initial_body_fat_pct = parseFloat(localInitFat);
      if (localInitMuscle && (profileData.initial_muscle_mass_pct === undefined || profileData.initial_muscle_mass_pct === null)) profileData.initial_muscle_mass_pct = parseFloat(localInitMuscle);
      if (localInitWaist && (profileData.initial_waist_cm === undefined || profileData.initial_waist_cm === null)) profileData.initial_waist_cm = parseFloat(localInitWaist);
      if (localInitDate && !profileData.initial_checkin_date) profileData.initial_checkin_date = localInitDate;
      if (localCustom && !profileData.avatar_customization) {
        try { profileData.avatar_customization = JSON.parse(localCustom); } catch {}
      }

      // Sincroniza em cache local se o Supabase retornou dados atualizados
      if (data) {
        if (data.avatar_mascot_id) AsyncStorage.setItem(`avatar_mascot_${user.id}`, data.avatar_mascot_id).catch(() => {});
        if (data.sex) AsyncStorage.setItem(`bio_sex_${user.id}`, data.sex).catch(() => {});
        if (data.weight_kg !== undefined && data.weight_kg !== null) AsyncStorage.setItem(`bio_weight_${user.id}`, String(data.weight_kg)).catch(() => {});
        if (data.body_fat_pct !== undefined && data.body_fat_pct !== null) AsyncStorage.setItem(`bio_fat_${user.id}`, String(data.body_fat_pct)).catch(() => {});
        if (data.muscle_mass_pct !== undefined && data.muscle_mass_pct !== null) AsyncStorage.setItem(`bio_muscle_${user.id}`, String(data.muscle_mass_pct)).catch(() => {});
        if (data.body_water_pct !== undefined && data.body_water_pct !== null) AsyncStorage.setItem(`bio_water_${user.id}`, String(data.body_water_pct)).catch(() => {});
        if (data.basal_metabolism_kcal !== undefined && data.basal_metabolism_kcal !== null) AsyncStorage.setItem(`bio_basal_${user.id}`, String(data.basal_metabolism_kcal)).catch(() => {});
        if (data.metabolic_age !== undefined && data.metabolic_age !== null) AsyncStorage.setItem(`bio_meta_age_${user.id}`, String(data.metabolic_age)).catch(() => {});
        if (data.waist_cm !== undefined && data.waist_cm !== null) AsyncStorage.setItem(`bio_waist_${user.id}`, String(data.waist_cm)).catch(() => {});
      }
    } catch {}
    return profileData;
  }

  // 2. Metas diárias
  if (endpoint === '/api/profile/targets') {
    if (!user) return DEFAULT_TARGETS;
    const { data } = await supabase.from('daily_targets').select('*').eq('user_id', user.id).maybeSingle();
    return data || DEFAULT_TARGETS;
  }

// Helper gratuito para consulta de produtos industrializados e código de barras (Open Food Facts - ODbL)
async function fetchOpenFoodFacts(queryOrBarcode: string): Promise<any[]> {
  try {
    const clean = queryOrBarcode.trim();
    if (!clean) return [];
    const isBarcode = /^\d{8,14}$/.test(clean);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    if (isBarcode) {
      const url = `https://world.openfoodfacts.org/api/v2/product/${clean}.json`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return [];
      const json = await res.json();
      if (json.status !== 1 || !json.product) return [];
      const p = json.product;
      const nut = p.nutriments || {};
      const name = p.product_name_pt || p.product_name || `Produto (${clean})`;
      const brand = p.brands ? ` (${p.brands})` : '';

      return [{
        id: `off_${clean}`,
        name: `${name}${brand}`,
        calories: Math.round(Number(nut['energy-kcal_100g'] || (nut['energy_100g'] ? nut['energy_100g'] / 4.184 : 0)) || 0),
        protein_g: Math.round(Number(nut.proteins_100g || 0) * 10) / 10,
        carbs_g: Math.round(Number(nut.carbohydrates_100g || 0) * 10) / 10,
        fats_g: Math.round(Number(nut.fat_100g || 0) * 10) / 10,
        saturated_fats_g: Math.round(Number(nut['saturated-fat_100g'] || 0) * 10) / 10,
        monounsaturated_fats_g: Math.round(Number(nut['monounsaturated-fat_100g'] || 0) * 10) / 10,
        polyunsaturated_fats_g: Math.round(Number(nut['polyunsaturated-fat_100g'] || 0) * 10) / 10,
        trans_fats_g: Math.round(Number(nut['trans-fat_100g'] || 0) * 10) / 10,
        cholesterol_mg: Math.round(Number(nut['cholesterol_100g'] ? nut['cholesterol_100g'] * 1000 : 0)),
        fiber_g: Math.round(Number(nut.fiber_100g || 0) * 10) / 10,
        sodium_mg: Math.round(Number(nut.sodium_100g ? nut.sodium_100g * 1000 : (nut.salt_100g ? (nut.salt_100g / 2.5) * 1000 : 0))),
        base_qty: 100,
        unit_type: 'g',
        category: 'Industrializados',
        source: 'openfoodfacts',
        is_custom: false,
        nova_group: Number(p.nova_group || nut['nova-group'] || 4),
      }];
    } else {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(clean)}&search_simple=1&action=process&json=1&page_size=6`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return [];
      const json = await res.json();
      const products = json.products || [];
      return products
        .filter((p: any) => (p.product_name || p.product_name_pt) && p.nutriments)
        .map((p: any) => {
          const nut = p.nutriments || {};
          const name = p.product_name_pt || p.product_name;
          const brand = p.brands ? ` (${p.brands})` : '';
          return {
            id: `off_${p.code || Math.random().toString(36).substring(7)}`,
            name: `${name}${brand}`,
            calories: Math.round(Number(nut['energy-kcal_100g'] || (nut['energy_100g'] ? nut['energy_100g'] / 4.184 : 0)) || 0),
            protein_g: Math.round(Number(nut.proteins_100g || 0) * 10) / 10,
            carbs_g: Math.round(Number(nut.carbohydrates_100g || 0) * 10) / 10,
            fats_g: Math.round(Number(nut.fat_100g || 0) * 10) / 10,
            saturated_fats_g: Math.round(Number(nut['saturated-fat_100g'] || 0) * 10) / 10,
            monounsaturated_fats_g: Math.round(Number(nut['monounsaturated-fat_100g'] || 0) * 10) / 10,
            polyunsaturated_fats_g: Math.round(Number(nut['polyunsaturated-fat_100g'] || 0) * 10) / 10,
            trans_fats_g: Math.round(Number(nut['trans-fat_100g'] || 0) * 10) / 10,
            cholesterol_mg: Math.round(Number(nut['cholesterol_100g'] ? nut['cholesterol_100g'] * 1000 : 0)),
            fiber_g: Math.round(Number(nut.fiber_100g || 0) * 10) / 10,
            sodium_mg: Math.round(Number(nut.sodium_100g ? nut.sodium_100g * 1000 : (nut.salt_100g ? (nut.salt_100g / 2.5) * 1000 : 0))),
            base_qty: 100,
            unit_type: 'g',
            category: 'Industrializados',
            source: 'openfoodfacts',
            is_custom: false,
            nova_group: Number(p.nova_group || nut['nova-group'] || 4),
          };
        });
    }
  } catch {
    return [];
  }
}

  // 3. Busca de Alimentos Inteligente (TBCA + TACO + Custom + Suplementos + Open Food Facts)
  if (endpoint === '/api/food/search') {
    const q = (params?.q || '').trim();
    const category = (params?.category || '').trim();

    // Se o usuário digitou ou colou um código de barras direto (8 a 14 dígitos numéricos)
    if (/^\d{8,14}$/.test(q)) {
      const barcodeFoods = await fetchOpenFoodFacts(q);
      if (barcodeFoods.length > 0) {
        return { master: barcodeFoods, custom: [] };
      }
    }

    let masterData: any[] = [];

    // Tentativa 1: RPC PostgreSQL search_foods_v2 com ranking de relevância
    if (q || category) {
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('search_foods_v2', {
          search_term: q,
          p_limit: 40,
          p_category: category || null,
        });
        if (!rpcErr && rpcData && rpcData.length > 0) {
          masterData = rpcData;
        }
      } catch {
        // Fallback silencioso para consulta direta
      }
    }

    // Tentativa 2: Consulta direta com ordenação inteligente por relevância (sem order by calories desc!)
    if (masterData.length === 0) {
      let masterQuery = supabase
        .from('foods_master')
        .select('*')
        .limit(40);

      if (category) {
        masterQuery = masterQuery.ilike('category', `%${category}%`);
      }

      if (q) {
        masterQuery = masterQuery.ilike('name', `%${q}%`);
      }

      const { data } = await masterQuery;
      let raw = data || [];

      // Ordenação inteligente: 1) Começa com o termo; 2) Fonte pura (TACO/Verified); 3) Nome mais curto
      if (q) {
        const qLower = q.toLowerCase();
        raw.sort((a: any, b: any) => {
          const aName = (a.name || '').toLowerCase();
          const bName = (b.name || '').toLowerCase();
          const aStarts = aName.startsWith(qLower) ? 1 : 0;
          const bStarts = bName.startsWith(qLower) ? 1 : 0;
          if (aStarts !== bStarts) return bStarts - aStarts;

          const aPure = (a.source === 'taco' || a.source === 'verified') ? 1 : 0;
          const bPure = (b.source === 'taco' || b.source === 'verified') ? 1 : 0;
          if (aPure !== bPure) return bPure - aPure;

          return aName.length - bName.length;
        });
      }
      masterData = raw;
    }

    let customData: any[] = [];
    if (user) {
      let customQuery = supabase.from('foods_custom').select('*').eq('user_id', user.id).limit(30);
      if (category) {
        customQuery = customQuery.ilike('category', `%${category}%`);
      }
      if (q) {
        customQuery = customQuery.ilike('name', `%${q}%`);
      }
      const { data } = await customQuery;
      customData = (data || []).map((f) => ({ ...f, is_custom: true }));
    }

    // Fallback gracioso Open Food Facts se não houver registros suficientes no banco local para termo longo
    if (masterData.length === 0 && customData.length === 0 && q.length >= 3 && category !== 'Pratos Brasileiros') {
      const offFoods = await fetchOpenFoodFacts(q);
      if (offFoods.length > 0) {
        masterData = offFoods;
      }
    }

    return { master: masterData || [], custom: customData };
  }

  // 4. Diário Alimentar do Dia
  if (endpoint === '/api/food/log') {
    if (!user) return [];
    const date = params?.date || new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('created_at', { ascending: true });
    return data || [];
  }

  // 5. Favoritos
  if (endpoint === '/api/food/favorites') {
    if (!user) return [];
    const { data } = await supabase
      .from('favorites')
      .select('id, food_master_id, food_custom_id, foods_master(*), foods_custom(*)')
      .eq('user_id', user.id);

    const favorites: any[] = [];
    for (const fav of data || []) {
      const foodData = fav.foods_master || fav.foods_custom;
      if (foodData) {
        favorites.push({
          ...foodData,
          favorite_id: fav.id,
          is_custom: Boolean(fav.food_custom_id),
        });
      }
    }
    return favorites;
  }

  // 6. Recentes
  if (endpoint === '/api/food/recent') {
    if (!user) return [];
    const limit = Number(params?.limit || 20);
    const { data: logs } = await supabase
      .from('food_logs')
      .select('food_master_id, food_custom_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit * 2);

    const seen = new Set<string>();
    const masterIds: string[] = [];
    const customIds: string[] = [];

    for (const log of logs || []) {
      if (log.food_master_id && !seen.has(log.food_master_id)) {
        seen.add(log.food_master_id);
        masterIds.push(log.food_master_id);
      } else if (log.food_custom_id && !seen.has(log.food_custom_id)) {
        seen.add(log.food_custom_id);
        customIds.push(log.food_custom_id);
      }
    }

    const recentFoods: any[] = [];
    if (masterIds.length > 0) {
      const { data: master } = await supabase
        .from('foods_master')
        .select('*')
        .in('id', masterIds.slice(0, limit));
      (master || []).forEach((f) => recentFoods.push({ ...f, is_custom: false }));
    }
    if (customIds.length > 0) {
      const { data: custom } = await supabase
        .from('foods_custom')
        .select('*')
        .in('id', customIds.slice(0, limit));
      (custom || []).forEach((f) => recentFoods.push({ ...f, is_custom: true }));
    }
    return recentFoods;
  }

  // 7. Água
  if (endpoint === '/api/water/') {
    if (!user) return [];
    const date = params?.date || new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('water_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date);
    return data || [];
  }

  // 8. Peso
  if (endpoint === '/api/weight/') {
    if (!user) return [];
    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30);
    return data || [];
  }

  // 9. Exercícios do Catálogo
  if (endpoint === '/api/exercises/master') {
    const { data } = await supabase
      .from('exercises_master')
      .select('*')
      .order('name', { ascending: true });
    return data || [];
  }

  // 10. Diário de Exercícios
  if (endpoint === '/api/exercises/log') {
    if (!user) return [];
    const date = params?.date || new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('created_at', { ascending: true });
    return data || [];
  }

  // 11. Resumo Diário (Analytics Daily)
  if (endpoint === '/api/analytics/daily') {
    if (!user) return { summary: { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0, water: 0 }, targets: DEFAULT_TARGETS };
    const date = params?.date || new Date().toISOString().split('T')[0];

    const [foodRes, waterRes, exerciseRes, targetsRes] = await Promise.all([
      supabase.from('food_logs').select('*').eq('user_id', user.id).eq('date', date),
      supabase.from('water_logs').select('*').eq('user_id', user.id).eq('date', date),
      supabase.from('exercise_logs').select('*').eq('user_id', user.id).eq('date', date),
      supabase.from('daily_targets').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    const foodData = foodRes.data || [];
    const waterData = waterRes.data || [];
    const exerciseData = exerciseRes.data || [];

    const totalCals = foodData.reduce((acc, f) => acc + Number(f.calories || 0), 0);
    const totalProtein = foodData.reduce((acc, f) => acc + Number(f.protein_g || 0), 0);
    const totalCarbs = foodData.reduce((acc, f) => acc + Number(f.carbs_g || 0), 0);
    const totalFats = foodData.reduce((acc, f) => acc + Number(f.fats_g || 0), 0);
    const totalSatFats = foodData.reduce((acc, f) => acc + Number(f.saturated_fats_g || 0), 0);
    const totalMonoFats = foodData.reduce((acc, f) => acc + Number(f.monounsaturated_fats_g || 0), 0);
    const totalPolyFats = foodData.reduce((acc, f) => acc + Number(f.polyunsaturated_fats_g || 0), 0);
    const totalTransFats = foodData.reduce((acc, f) => acc + Number(f.trans_fats_g || 0), 0);
    const totalCholesterol = foodData.reduce((acc, f) => acc + Number(f.cholesterol_mg || 0), 0);
    const totalFiber = foodData.reduce((acc, f) => acc + Number(f.fiber_g || 0), 0);
    const totalWater = waterData.reduce((acc, w) => acc + Number(w.amount_ml || 0), 0);
    const totalExerciseMinutes = exerciseData.reduce((acc, e) => acc + Number(e.duration_minutes || 0), 0);
    const totalExerciseCals = exerciseData.reduce((acc, e) => acc + Number(e.calories_burned || 0), 0);

    return {
      summary: {
        calories: Math.round(totalCals),
        protein: Math.round(totalProtein * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
        fats: Math.round(totalFats * 10) / 10,
        saturated_fats: Math.round(totalSatFats * 10) / 10,
        monounsaturated_fats: Math.round(totalMonoFats * 10) / 10,
        polyunsaturated_fats: Math.round(totalPolyFats * 10) / 10,
        trans_fats: Math.round(totalTransFats * 100) / 100,
        cholesterol: Math.round(totalCholesterol * 10) / 10,
        fiber: Math.round(totalFiber * 10) / 10,
        water: totalWater,
        exerciseMinutes: totalExerciseMinutes,
        exerciseCalories: Math.round(totalExerciseCals),
      },
      targets: targetsRes.data || DEFAULT_TARGETS,
    };
  }

  // 12. Resumo Semanal (Analytics Weekly)
  if (endpoint === '/api/analytics/weekly') {
    if (!user) {
      return { data: [], targets: DEFAULT_TARGETS, streak: { current_streak: 0, best_streak: 0 }, weight_trend: 0, weight_logs: [] };
    }

    const days = Number(params?.days || 7);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (days - 1));
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const [foodRes, waterRes, weightRes, targetsRes, streakRes, exercisesRes] = await Promise.all([
      supabase.from('food_logs').select('*').eq('user_id', user.id).gte('date', startStr).lte('date', endStr),
      supabase.from('water_logs').select('*').eq('user_id', user.id).gte('date', startStr).lte('date', endStr),
      supabase.from('weight_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
      supabase.from('daily_targets').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('streaks').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('exercise_logs').select('*').eq('user_id', user.id).gte('date', startStr).lte('date', endStr),
    ]);

    const targets = targetsRes.data || DEFAULT_TARGETS;
    const foodData = foodRes.data || [];
    const waterData = waterRes.data || [];
    const weightData = weightRes.data || [];
    const exercisesData = exercisesRes.data || [];

    const dailyData: any[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const dayFoods = foodData.filter((f) => f.date === dStr);
      const dayWaters = waterData.filter((w) => w.date === dStr);
      const dayExercises = exercisesData.filter((e) => e.date === dStr);

      dailyData.push({
        date: dStr,
        summary: {
          calories: dayFoods.reduce((acc, f) => acc + Number(f.calories || 0), 0),
          protein: dayFoods.reduce((acc, f) => acc + Number(f.protein_g || 0), 0),
          carbs: dayFoods.reduce((acc, f) => acc + Number(f.carbs_g || 0), 0),
          fats: dayFoods.reduce((acc, f) => acc + Number(f.fats_g || 0), 0),
          saturated_fats: dayFoods.reduce((acc, f) => acc + Number(f.saturated_fats_g || 0), 0),
          monounsaturated_fats: dayFoods.reduce((acc, f) => acc + Number(f.monounsaturated_fats_g || 0), 0),
          polyunsaturated_fats: dayFoods.reduce((acc, f) => acc + Number(f.polyunsaturated_fats_g || 0), 0),
          trans_fats: dayFoods.reduce((acc, f) => acc + Number(f.trans_fats_g || 0), 0),
          cholesterol: dayFoods.reduce((acc, f) => acc + Number(f.cholesterol_mg || 0), 0),
          fiber: dayFoods.reduce((acc, f) => acc + Number(f.fiber_g || 0), 0),
          water: dayWaters.reduce((acc, w) => acc + Number(w.amount_ml || 0), 0),
          exerciseMinutes: dayExercises.reduce((acc, e) => acc + Number(e.duration_minutes || 0), 0),
          exerciseCalories: dayExercises.reduce((acc, e) => acc + Number(e.calories_burned || 0), 0),
        },
        targets,
      });
    }

    let weightTrend = 0;
    if (weightData.length >= 2) {
      weightTrend = Number(weightData[0].weight_kg) - Number(weightData[weightData.length - 1].weight_kg);
    }

    return {
      data: dailyData,
      targets,
      streak: streakRes.data || { current_streak: 0, best_streak: 0 },
      weight_trend: Math.round(weightTrend * 10) / 10,
      weight_logs: weightData,
      exercises: exercisesData,
    };
  }

  // 13. Grupos do Usuário
  if (endpoint === '/api/groups/my') {
    if (!user) return [];
    const { data } = await supabase
      .from('group_members')
      .select('group_id, role, joined_at, groups(id, name, description, invite_code, owner_id)')
      .eq('user_id', user.id);
    return (data || []).map((m: any) => ({
      ...m.groups,
      role: m.role,
      joined_at: m.joined_at,
    }));
  }

  // 14. Ranking Semanal por Hábitos (View Anti-Fraude)
  if (endpoint === '/api/groups/leaderboard') {
    const groupId = params?.group_id;
    if (groupId) {
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);
      const memberIds = (members || []).map((m: any) => m.user_id);
      if (memberIds.length === 0) return [];
      const { data } = await supabase
        .from('view_weekly_habit_leaderboard')
        .select('*')
        .in('user_id', memberIds)
        .order('total_habit_points', { ascending: false });
      return data || [];
    }

    const { data } = await supabase
      .from('view_weekly_habit_leaderboard')
      .select('*')
      .order('total_habit_points', { ascending: false })
      .limit(50);
    return data || [];
  }

  // 15. Status do Check-in Periódico (Bioimpedância & Peso)
  if (endpoint === '/api/checkin/status') {
    if (!user) {
      return {
        isDue: false,
        reason: 'already_done',
        daysSinceLastCheckin: 0,
        nextDueDateFormatted: '',
        badgeLabel: '',
        profile: null,
      };
    }

    let profile: any = null;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, age, height_cm, weight_kg, body_fat_pct, muscle_mass_pct, body_water_pct, basal_metabolism_kcal, metabolic_age, checkin_frequency_days, preferred_checkin_weekday, last_checkin_date, last_skipped_checkin_date')
        .eq('id', user.id)
        .maybeSingle();
      profile = data;
    } catch (err) {
      console.warn('[CheckinStatus] Falha ao consultar status de perfil:', err);
    }

    // Fallback de medidas se profile ou colunas estiverem nulas/offline
    if (!profile) {
      try {
        const [localWeight, localFat, localMuscle, localWaist] = await Promise.all([
          AsyncStorage.getItem(`bio_weight_${user.id}`),
          AsyncStorage.getItem(`bio_fat_${user.id}`),
          AsyncStorage.getItem(`bio_muscle_${user.id}`),
          AsyncStorage.getItem(`bio_waist_${user.id}`),
        ]);
        profile = {
          id: user.id,
          weight_kg: localWeight ? parseFloat(localWeight) : null,
          body_fat_pct: localFat ? parseFloat(localFat) : null,
          muscle_mass_pct: localMuscle ? parseFloat(localMuscle) : null,
          waist_cm: localWaist ? parseFloat(localWaist) : null,
          checkin_frequency_days: 7,
          preferred_checkin_weekday: 1,
        };
      } catch {}
    }

    const status = evaluateCheckinDue({
      lastCheckinDate: profile?.last_checkin_date,
      lastSkippedDate: profile?.last_skipped_checkin_date,
      frequencyDays: profile?.checkin_frequency_days || 7,
      preferredWeekday: profile?.preferred_checkin_weekday ?? 1,
    });

    return {
      ...status,
      profile: profile || null,
    };
  }

  // 16. Comparativo Completo de Bioimpedância (Primeira vs Última)
  if (endpoint === '/api/checkin/comparison') {
    if (!user) {
      return {
        firstBio: null,
        latestBio: null,
        deltas: { weightDeltaKg: 0, fatDeltaPct: null, muscleDeltaPct: null, waistDeltaCm: null },
        status: 'baseline',
        feedback: 'Sem registros de bioimpedância ainda.',
        hasHistory: false,
      };
    }

    try {
      // 1. Busca perfil para linha de base inicial
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // 2. Busca primeiro e último check-ins cadastrados
      const [firstCheckinRes, latestCheckinRes] = await Promise.all([
        supabase
          .from('body_checkins')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('body_checkins')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const firstCheckin = firstCheckinRes.data;
      const latestCheckin = latestCheckinRes.data;

      // Monta Primeiro Registro (Marco Zero)
      const firstWeight = Number(firstCheckin?.weight_kg || profile?.initial_weight_kg || profile?.weight_kg || 0);
      const firstFat = firstCheckin?.body_fat_pct !== undefined && firstCheckin?.body_fat_pct !== null
        ? Number(firstCheckin.body_fat_pct)
        : (profile?.initial_body_fat_pct !== undefined && profile?.initial_body_fat_pct !== null ? Number(profile.initial_body_fat_pct) : (profile?.body_fat_pct ? Number(profile.body_fat_pct) : null));
      const firstMuscle = firstCheckin?.muscle_mass_pct !== undefined && firstCheckin?.muscle_mass_pct !== null
        ? Number(firstCheckin.muscle_mass_pct)
        : (profile?.initial_muscle_mass_pct !== undefined && profile?.initial_muscle_mass_pct !== null ? Number(profile.initial_muscle_mass_pct) : (profile?.muscle_mass_pct ? Number(profile.muscle_mass_pct) : null));
      const firstWaist = firstCheckin?.waist_cm !== undefined && firstCheckin?.waist_cm !== null
        ? Number(firstCheckin.waist_cm)
        : (profile?.initial_waist_cm !== undefined && profile?.initial_waist_cm !== null ? Number(profile.initial_waist_cm) : (profile?.waist_cm ? Number(profile.waist_cm) : null));
      const firstDate = firstCheckin?.date || profile?.initial_checkin_date || profile?.created_at?.split('T')[0] || 'Início';

      // Monta Último Registro (Atual)
      const latestWeight = Number(latestCheckin?.weight_kg || profile?.weight_kg || firstWeight);
      const latestFat = latestCheckin?.body_fat_pct !== undefined && latestCheckin?.body_fat_pct !== null
        ? Number(latestCheckin.body_fat_pct)
        : (profile?.body_fat_pct !== undefined && profile?.body_fat_pct !== null ? Number(profile.body_fat_pct) : null);
      const latestMuscle = latestCheckin?.muscle_mass_pct !== undefined && latestCheckin?.muscle_mass_pct !== null
        ? Number(latestCheckin.muscle_mass_pct)
        : (profile?.muscle_mass_pct !== undefined && profile?.muscle_mass_pct !== null ? Number(profile.muscle_mass_pct) : null);
      const latestWaist = latestCheckin?.waist_cm !== undefined && latestCheckin?.waist_cm !== null
        ? Number(latestCheckin.waist_cm)
        : (profile?.waist_cm !== undefined && profile?.waist_cm !== null ? Number(profile.waist_cm) : null);
      const latestDate = latestCheckin?.date || profile?.last_checkin_date || 'Hoje';

      // Deltas
      const weightDeltaKg = Math.round((latestWeight - firstWeight) * 10) / 10;
      const fatDeltaPct = (latestFat !== null && firstFat !== null) ? Math.round((latestFat - firstFat) * 10) / 10 : null;
      const muscleDeltaPct = (latestMuscle !== null && firstMuscle !== null) ? Math.round((latestMuscle - firstMuscle) * 10) / 10 : null;
      const waistDeltaCm = (latestWaist !== null && firstWaist !== null) ? Math.round((latestWaist - firstWaist) * 10) / 10 : null;

      // Classificação Clínica do Progresso (Identifica Flacidez/Catabolismo vs Ganho Magro vs Emagrecimento Saudável)
      let status: 'great_progress' | 'hypertrophy' | 'muscle_loss_alert' | 'fat_gain_alert' | 'baseline' = 'baseline';
      let feedback = '';

      const hasHistory = (firstCheckin && latestCheckin && firstCheckin.id !== latestCheckin.id) ||
                         (profile?.initial_weight_kg && Math.abs(profile.initial_weight_kg - (profile.weight_kg || 0)) >= 0.3);

      if (!hasHistory) {
        status = 'baseline';
        feedback = 'Seu mascote está calibrado no Marco Zero da sua jornada. A cada nova pesagem na balança, ele atualizará sua silhueta!';
      } else if (weightDeltaKg < 0 && ((fatDeltaPct !== null && fatDeltaPct > 0.5) || (muscleDeltaPct !== null && muscleDeltaPct < -1.2))) {
        // Alerta de Falso Magro / Flacidez: perdeu peso, mas perdeu massa muscular ou reteve gordura (alimentação desbalanceada / doces)
        status = 'muscle_loss_alert';
        feedback = `Atenção: o peso caiu ${Math.abs(weightDeltaKg)} kg, mas houve perda de músculo ou retenção de gordura! Seu mascote indica flacidez: capriche em proteínas e treino de força!`;
      } else if (muscleDeltaPct !== null && muscleDeltaPct > 0.8 && (fatDeltaPct === null || fatDeltaPct <= 0.8)) {
        status = 'hypertrophy';
        feedback = `Evolução Campeã! Ganho de +${muscleDeltaPct}% de massa muscular! Seu mascote está mais denso, forte e com bíceps destacados!`;
      } else if (weightDeltaKg < 0 && (fatDeltaPct === null || fatDeltaPct <= 0)) {
        status = 'great_progress';
        const waistText = waistDeltaCm && waistDeltaCm < 0 ? ` e menos ${Math.abs(waistDeltaCm)} cm de cintura` : '';
        feedback = `Excelente queima de gordura! Menos ${Math.abs(weightDeltaKg)} kg na balança${waistText}! Sua silhueta está mais enxuta e definida!`;
      } else if (weightDeltaKg > 1.5 && fatDeltaPct !== null && fatDeltaPct > 1.0) {
        status = 'fat_gain_alert';
        feedback = `A balança subiu +${weightDeltaKg} kg e a gordura aumentou +${fatDeltaPct}%. Seu mascote está no Modo Treino Pesado: hora de focar no déficit calórico!`;
      } else {
        status = 'baseline';
        feedback = `Composição estável. Siga consistente na dieta e hidratação para desbloquear a próxima fase!`;
      }

      return {
        firstBio: {
          date: firstDate,
          weightKg: firstWeight,
          bodyFatPct: firstFat,
          muscleMassPct: firstMuscle,
          waistCm: firstWaist,
        },
        latestBio: {
          date: latestDate,
          weightKg: latestWeight,
          bodyFatPct: latestFat,
          muscleMassPct: latestMuscle,
          waistCm: latestWaist,
        },
        deltas: {
          weightDeltaKg,
          fatDeltaPct,
          muscleDeltaPct,
          waistDeltaCm,
        },
        status,
        feedback,
        hasHistory,
      };
    } catch (e) {
      console.warn('Erro ao processar comparativo de bioimpedância:', e);
      return {
        firstBio: null,
        latestBio: null,
        deltas: { weightDeltaKg: 0, fatDeltaPct: null, muscleDeltaPct: null, waistDeltaCm: null },
        status: 'baseline',
        feedback: 'Dados iniciais carregados.',
        hasHistory: false,
      };
    }
  }

  // 17. Histórico Completo de Bioimpedância & Composição Corporal
  if (endpoint === '/api/checkin/history') {
    if (!user) return { records: [], profile: { sex: 'female', height_cm: 170, waistThreshold: 88 } };

    const [checkinsRes, profileRes] = await Promise.all([
      supabase
        .from('body_checkins')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true }),
      supabase
        .from('profiles')
        .select('sex, height_cm, initial_weight_kg, initial_body_fat_pct, initial_muscle_mass_pct, initial_waist_cm, initial_checkin_date, created_at')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    const profileData: any = profileRes.data || {};
    const sex = profileData.sex || 'female';
    const waistThreshold = sex === 'male' ? 102 : 88;

    const rawRecords = checkinsRes.data || [];
    const formattedRecords: any[] = [];

    // Se houver baseline no profile e nenhum checkin com essa data inicial, insere o marco zero
    const firstCheckinDate = rawRecords[0]?.date;
    const initialDate = profileData.initial_checkin_date || profileData.created_at?.split('T')[0];
    if (initialDate && (!firstCheckinDate || initialDate < firstCheckinDate) && profileData.initial_weight_kg) {
      formattedRecords.push({
        date: initialDate,
        weight_kg: Number(profileData.initial_weight_kg),
        body_fat_pct: profileData.initial_body_fat_pct ? Number(profileData.initial_body_fat_pct) : null,
        muscle_mass_pct: profileData.initial_muscle_mass_pct ? Number(profileData.initial_muscle_mass_pct) : null,
        waist_cm: profileData.initial_waist_cm ? Number(profileData.initial_waist_cm) : null,
        is_baseline: true,
      });
    }

    for (const r of rawRecords) {
      formattedRecords.push({
        date: r.date,
        weight_kg: Number(r.weight_kg),
        body_fat_pct: r.body_fat_pct !== null && r.body_fat_pct !== undefined ? Number(r.body_fat_pct) : null,
        muscle_mass_pct: r.muscle_mass_pct !== null && r.muscle_mass_pct !== undefined ? Number(r.muscle_mass_pct) : null,
        body_water_pct: r.body_water_pct !== null && r.body_water_pct !== undefined ? Number(r.body_water_pct) : null,
        basal_metabolism_kcal: r.basal_metabolism_kcal !== null && r.basal_metabolism_kcal !== undefined ? Number(r.basal_metabolism_kcal) : null,
        waist_cm: r.waist_cm !== null && r.waist_cm !== undefined ? Number(r.waist_cm) : null,
        visceral_fat: r.visceral_fat !== null && r.visceral_fat !== undefined ? Number(r.visceral_fat) : null,
        metabolic_age: r.metabolic_age !== null && r.metabolic_age !== undefined ? Number(r.metabolic_age) : null,
        bmi: r.bmi !== null && r.bmi !== undefined ? Number(r.bmi) : null,
        notes: r.notes || null,
      });
    }

    return {
      records: formattedRecords,
      profile: {
        sex,
        height_cm: Number(profileData.height_cm || 170),
        waistThreshold,
      },
    };
  }

  return null;
}

// Executa mutações diretamente no Supabase
async function executeSupabaseMutation(method: 'POST' | 'PUT' | 'DELETE', endpoint: string, body?: any): Promise<any> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !endpoint.includes('auth')) {
    throw new Error('Usuário não autenticado.');
  }

  if (method === 'POST') {
    // Log de Alimento
    if (endpoint === '/api/food/log') {
      const { data, error } = await supabase
        .from('food_logs')
        .insert({ user_id: user!.id, ...body })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    // Repetir Refeição do Dia Anterior (Funcionalidade Rápida)
    if (endpoint === '/api/food/repeat-meal') {
      const { sourceDate, targetDate, mealType } = body;
      const { data: prevLogs, error: fetchErr } = await supabase
        .from('food_logs')
        .select('meal_type, food_source, food_master_id, food_custom_id, food_name, brand, qty, unit_type, calories, protein_g, carbs_g, fats_g, saturated_fats_g, fiber_g, sodium_mg, nova_group')
        .eq('user_id', user!.id)
        .eq('date', sourceDate)
        .eq('meal_type', mealType);

      if (fetchErr) throw fetchErr;
      if (!prevLogs || prevLogs.length === 0) return { cloned: 0 };

      const newLogs = prevLogs.map((l) => ({
        ...l,
        user_id: user!.id,
        date: targetDate,
      }));

      const { data, error } = await supabase.from('food_logs').insert(newLogs).select();
      if (error) throw error;
      return { cloned: data?.length || 0 };
    }

    // Alimento Customizado
    if (endpoint === '/api/food/custom') {
      const { data, error } = await supabase
        .from('foods_custom')
        .insert({ user_id: user!.id, ...body })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    // Água
    if (endpoint === '/api/water/') {
      const { data, error } = await supabase
        .from('water_logs')
        .insert({ user_id: user!.id, ...body })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    // Peso
    if (endpoint === '/api/weight/') {
      const weightKg = Number(body?.weight_kg);
      const { data, error } = await supabase
        .from('weight_logs')
        .upsert({ user_id: user!.id, ...body }, { onConflict: 'user_id,date' })
        .select()
        .single();
      if (error) throw error;

      // Sincroniza também no perfil do usuário e no AsyncStorage para atualizar mascote e silhueta
      if (weightKg && !isNaN(weightKg) && weightKg > 0) {
        try {
          await AsyncStorage.setItem(`bio_weight_${user!.id}`, String(weightKg));
          const profilePatch: any = { weight_kg: weightKg };
          if (body.body_fat_pct !== undefined && body.body_fat_pct !== null) {
            profilePatch.body_fat_pct = Number(body.body_fat_pct);
            await AsyncStorage.setItem(`bio_fat_${user!.id}`, String(body.body_fat_pct));
          }
          if (body.muscle_mass_pct !== undefined && body.muscle_mass_pct !== null) {
            profilePatch.muscle_mass_pct = Number(body.muscle_mass_pct);
            await AsyncStorage.setItem(`bio_muscle_${user!.id}`, String(body.muscle_mass_pct));
          }
          if (body.body_water_pct !== undefined && body.body_water_pct !== null) {
            profilePatch.body_water_pct = Number(body.body_water_pct);
            await AsyncStorage.setItem(`bio_water_${user!.id}`, String(body.body_water_pct));
          }
          await supabase.from('profiles').update(profilePatch).eq('id', user!.id);
        } catch (syncErr) {
          console.warn('[WeightLog] Aviso ao sincronizar perfil:', syncErr);
        }
      }
      return data;
    }

    // Treino / Exercício
    if (endpoint === '/api/exercises/log') {
      const { data, error } = await supabase
        .from('exercise_logs')
        .insert({ user_id: user!.id, ...body })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    // Favoritos
    if (endpoint.startsWith('/api/food/favorites/')) {
      const foodId = endpoint.split('/').pop()!;
      const isCustom = body?.is_custom || false;
      const { data, error } = await supabase
        .from('favorites')
        .insert({
          user_id: user!.id,
          food_master_id: isCustom ? null : foodId,
          food_custom_id: isCustom ? foodId : null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    // Criar Grupo
    if (endpoint === '/api/groups/create') {
      const code = 'AK' + Math.random().toString(36).substring(2, 6).toUpperCase();
      const { data: newGroup, error: groupErr } = await supabase
        .from('groups')
        .insert({
          name: body.name,
          description: body.description || null,
          invite_code: code,
          owner_id: user!.id,
        })
        .select()
        .single();
      if (groupErr) throw groupErr;

      // Adiciona o criador como admin
      await supabase.from('group_members').insert({
        group_id: newGroup.id,
        user_id: user!.id,
        role: 'admin',
        share_consistency: true,
        share_workouts: true,
      });

      return newGroup;
    }

    // Entrar em Grupo com Código de Convite
    if (endpoint === '/api/groups/join') {
      const inviteCode = (body.invite_code || '').trim().toUpperCase();
      const { data: targetGroup, error: findErr } = await supabase
        .from('groups')
        .select('id, name')
        .eq('invite_code', inviteCode)
        .single();
      if (findErr || !targetGroup) throw new Error('Código de convite inválido ou grupo não encontrado.');

      const { data: member, error: memberErr } = await supabase
        .from('group_members')
        .insert({
          group_id: targetGroup.id,
          user_id: user!.id,
          role: 'member',
          share_consistency: true,
          share_workouts: true,
        })
        .select()
        .single();
      if (memberErr) {
        if (memberErr.code === '23505') throw new Error('Você já faz parte deste grupo!');
        throw memberErr;
      }

      return { success: true, group: targetGroup };
    }

    // Pular / Adiar Check-in de Bioimpedância
    if (endpoint === '/api/checkin/skip') {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('profiles')
        .update({ last_skipped_checkin_date: today })
        .eq('id', user!.id)
        .select()
        .single();
      if (error) throw error;
      return { skipped: true, date: today, profile: data };
    }

    // Registrar Check-in Oficial de Bioimpedância & Peso (+15 pts no grupo)
    if (endpoint === '/api/checkin/log' || endpoint === '/api/checkin/record') {
      const today = body?.date || new Date().toISOString().split('T')[0];
      const weightKg = Number(body?.weight_kg);

      if (!weightKg || isNaN(weightKg) || weightKg <= 0) {
        throw new Error('Peso em kg inválido para check-in.');
      }

      // 1. Inserir ou atualizar em body_checkins (com tolerância se tabela ainda não criada)
      const checkinRecord: any = {
        user_id: user!.id,
        date: today,
        weight_kg: weightKg,
        bmi: body.bmi ? Number(body.bmi) : null,
        body_fat_pct: body.body_fat_pct !== undefined && body.body_fat_pct !== null && body.body_fat_pct !== '' ? Number(body.body_fat_pct) : null,
        muscle_mass_pct: body.muscle_mass_pct !== undefined && body.muscle_mass_pct !== null && body.muscle_mass_pct !== '' ? Number(body.muscle_mass_pct) : null,
        body_water_pct: body.body_water_pct !== undefined && body.body_water_pct !== null && body.body_water_pct !== '' ? Number(body.body_water_pct) : null,
        basal_metabolism_kcal: body.basal_metabolism_kcal ? parseInt(body.basal_metabolism_kcal, 10) : null,
        metabolic_age: body.metabolic_age ? parseInt(body.metabolic_age, 10) : null,
        waist_cm: body.waist_cm !== undefined && body.waist_cm !== null && body.waist_cm !== '' ? Number(body.waist_cm) : null,
        notes: body.notes || null,
      };

      let savedCheckin: any = null;
      try {
        const { data, error } = await supabase
          .from('body_checkins')
          .upsert(checkinRecord, { onConflict: 'user_id,date' })
          .select()
          .maybeSingle();
        if (!error) savedCheckin = data;
        else console.warn('[Checkin] Erro ao salvar body_checkins:', error);
      } catch (e) {
        console.warn('[Checkin] Falha na tabela body_checkins (prosseguindo com perfil):', e);
      }

      // 2. Atualizar perfil com os novos dados corporais e data de último check-in
      const profileUpdates: any = {
        last_checkin_date: today,
        weight_kg: weightKg,
      };
      if (checkinRecord.body_fat_pct !== null) profileUpdates.body_fat_pct = checkinRecord.body_fat_pct;
      if (checkinRecord.muscle_mass_pct !== null) profileUpdates.muscle_mass_pct = checkinRecord.muscle_mass_pct;
      if (checkinRecord.body_water_pct !== null) profileUpdates.body_water_pct = checkinRecord.body_water_pct;
      if (checkinRecord.basal_metabolism_kcal !== null) profileUpdates.basal_metabolism_kcal = checkinRecord.basal_metabolism_kcal;
      if (checkinRecord.metabolic_age !== null) profileUpdates.metabolic_age = checkinRecord.metabolic_age;
      if (checkinRecord.waist_cm !== null) profileUpdates.waist_cm = checkinRecord.waist_cm;
      if (body.height_cm) profileUpdates.height_cm = Number(body.height_cm);
      if (body.age) profileUpdates.age = Number(body.age);

      // Se o perfil ainda não tem linha de base (Marco Zero), registra agora
      try {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('initial_weight_kg, initial_body_fat_pct, initial_muscle_mass_pct, initial_waist_cm, initial_checkin_date')
          .eq('id', user!.id)
          .maybeSingle();

        if (!currentProfile?.initial_weight_kg) {
          profileUpdates.initial_weight_kg = weightKg;
          profileUpdates.initial_checkin_date = today;
          if (checkinRecord.body_fat_pct !== null) profileUpdates.initial_body_fat_pct = checkinRecord.body_fat_pct;
          if (checkinRecord.muscle_mass_pct !== null) profileUpdates.initial_muscle_mass_pct = checkinRecord.muscle_mass_pct;
          if (checkinRecord.waist_cm !== null) profileUpdates.initial_waist_cm = checkinRecord.waist_cm;
        }
      } catch {}

      // Sincroniza em cache local para suporte offline completo
      try {
        await Promise.all([
          AsyncStorage.setItem(`bio_weight_${user!.id}`, String(weightKg)),
          checkinRecord.waist_cm !== null ? AsyncStorage.setItem(`bio_waist_${user!.id}`, String(checkinRecord.waist_cm)) : Promise.resolve(),
          checkinRecord.body_fat_pct !== null ? AsyncStorage.setItem(`bio_fat_${user!.id}`, String(checkinRecord.body_fat_pct)) : Promise.resolve(),
          checkinRecord.muscle_mass_pct !== null ? AsyncStorage.setItem(`bio_muscle_${user!.id}`, String(checkinRecord.muscle_mass_pct)) : Promise.resolve(),
          checkinRecord.body_water_pct !== null ? AsyncStorage.setItem(`bio_water_${user!.id}`, String(checkinRecord.body_water_pct)) : Promise.resolve(),
          checkinRecord.basal_metabolism_kcal !== null ? AsyncStorage.setItem(`bio_basal_${user!.id}`, String(checkinRecord.basal_metabolism_kcal)) : Promise.resolve(),
          checkinRecord.metabolic_age !== null ? AsyncStorage.setItem(`bio_meta_age_${user!.id}`, String(checkinRecord.metabolic_age)) : Promise.resolve(),
        ]);
      } catch {}

      try {
        await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', user!.id);
      } catch (err: any) {
        if (profileUpdates.waist_cm) {
          delete profileUpdates.waist_cm;
          await supabase.from('profiles').update(profileUpdates).eq('id', user!.id);
        }
      }

      // 3. Registrar no histórico de peso (weight_logs) para alimentar os gráficos
      await supabase
        .from('weight_logs')
        .upsert({
          user_id: user!.id,
          date: today,
          weight_kg: weightKg,
          body_fat_pct: checkinRecord.body_fat_pct,
          muscle_mass_pct: checkinRecord.muscle_mass_pct,
          body_water_pct: checkinRecord.body_water_pct,
        }, { onConflict: 'user_id,date' });

      return { success: true, checkin: savedCheckin || checkinRecord };
    }
  }

  if (method === 'PUT') {
    // Atualizar Perfil
    if (endpoint === '/api/profile/') {
      if (body.weight_kg !== undefined && body.weight_kg !== null && !isNaN(Number(body.weight_kg))) {
        try { await AsyncStorage.setItem(`bio_weight_${user!.id}`, String(body.weight_kg)); } catch {}
      }
      if (body.avatar_mascot_id) {
        try { await AsyncStorage.setItem(`avatar_mascot_${user!.id}`, body.avatar_mascot_id); } catch {}
      }
      if (body.sex) {
        try { await AsyncStorage.setItem(`bio_sex_${user!.id}`, body.sex); } catch {}
      }
      if (body.waist_cm !== undefined && body.waist_cm !== null) {
        try { await AsyncStorage.setItem(`bio_waist_${user!.id}`, String(body.waist_cm)); } catch {}
      }
      if (body.body_fat_pct !== undefined && body.body_fat_pct !== null) {
        try { await AsyncStorage.setItem(`bio_fat_${user!.id}`, String(body.body_fat_pct)); } catch {}
      }
      if (body.muscle_mass_pct !== undefined && body.muscle_mass_pct !== null) {
        try { await AsyncStorage.setItem(`bio_muscle_${user!.id}`, String(body.muscle_mass_pct)); } catch {}
      }
      if (body.body_water_pct !== undefined && body.body_water_pct !== null) {
        try { await AsyncStorage.setItem(`bio_water_${user!.id}`, String(body.body_water_pct)); } catch {}
      }
      if (body.basal_metabolism_kcal !== undefined && body.basal_metabolism_kcal !== null) {
        try { await AsyncStorage.setItem(`bio_basal_${user!.id}`, String(body.basal_metabolism_kcal)); } catch {}
      }
      if (body.metabolic_age !== undefined && body.metabolic_age !== null) {
        try { await AsyncStorage.setItem(`bio_meta_age_${user!.id}`, String(body.metabolic_age)); } catch {}
      }
      if (body.initial_weight_kg !== undefined && body.initial_weight_kg !== null) {
        try { await AsyncStorage.setItem(`bio_init_weight_${user!.id}`, String(body.initial_weight_kg)); } catch {}
      }
      if (body.initial_body_fat_pct !== undefined && body.initial_body_fat_pct !== null) {
        try { await AsyncStorage.setItem(`bio_init_fat_${user!.id}`, String(body.initial_body_fat_pct)); } catch {}
      }
      if (body.initial_muscle_mass_pct !== undefined && body.initial_muscle_mass_pct !== null) {
        try { await AsyncStorage.setItem(`bio_init_muscle_${user!.id}`, String(body.initial_muscle_mass_pct)); } catch {}
      }
      if (body.initial_waist_cm !== undefined && body.initial_waist_cm !== null) {
        try { await AsyncStorage.setItem(`bio_init_waist_${user!.id}`, String(body.initial_waist_cm)); } catch {}
      }
      if (body.initial_checkin_date) {
        try { await AsyncStorage.setItem(`bio_init_date_${user!.id}`, body.initial_checkin_date); } catch {}
      }
      if (body.avatar_customization) {
        try { await AsyncStorage.setItem(`avatar_custom_${user!.id}`, JSON.stringify(body.avatar_customization)); } catch {}
      }

      // Normalização robusta de data de nascimento para ISO 8601 (YYYY-MM-DD)
      let normalizedBirthDate: string | null = null;
      if (body.birth_date) {
        const s = String(body.birth_date).trim();
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
          const [d, m, y] = s.split('/');
          normalizedBirthDate = `${y}-${m}-${d}`;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          normalizedBirthDate = s;
        }
      }

      if (body.birth_date) {
        try { await AsyncStorage.setItem(`birth_date_${user!.id}`, body.birth_date); } catch {}
      }

      // Sincroniza também no user_metadata do auth para backup de conta
      try {
        await supabase.auth.updateUser({
          data: {
            name: body.name || undefined,
            sex: body.sex || undefined,
            birth_date: normalizedBirthDate || body.birth_date || undefined,
            avatar_mascot_id: body.avatar_mascot_id || undefined,
            waist_cm: body.waist_cm || undefined,
            body_fat_pct: body.body_fat_pct || undefined,
            muscle_mass_pct: body.muscle_mass_pct || undefined,
            body_water_pct: body.body_water_pct || undefined,
            basal_metabolism_kcal: body.basal_metabolism_kcal || undefined,
            metabolic_age: body.metabolic_age || undefined,
          }
        });
      } catch {}

      let payload = { ...body, id: user!.id };
      if (normalizedBirthDate !== null) {
        payload.birth_date = normalizedBirthDate;
      } else if (body.birth_date === '' || body.birth_date === null) {
        payload.birth_date = null;
      }

      // Upsert atômico (insere se não existir via profiles_insert_own, ou atualiza via profiles_update_own)
      let { data, error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      // Tolerância cirúrgica: se uma coluna não existir no schema remoto ou falhar, remove cirurgicamente
      if (error && error.message) {
        const msg = error.message.toLowerCase();
        let changed = false;

        const candidateColumns = [
          'birth_date',
          'avatar_customization',
          'initial_muscle_mass_pct',
          'initial_checkin_date',
          'initial_waist_cm',
          'initial_body_fat_pct',
          'initial_weight_kg',
          'avatar_mascot_id',
          'waist_cm',
          'body_water_pct',
          'basal_metabolism_kcal',
          'metabolic_age',
          'muscle_mass_pct',
          'body_fat_pct',
          'sex',
        ];

        // Se o erro for de formato de data, remove especificamente birth_date
        if (msg.includes('date/time') || msg.includes('syntax for type date') || msg.includes('birth_date')) {
          delete (payload as any)['birth_date'];
          changed = true;
        }

        // 1. Tenta remoção cirúrgica da coluna específica identificada no erro
        for (const col of candidateColumns) {
          if (msg.includes(col) && col in payload) {
            delete (payload as any)[col];
            changed = true;
          }
        }

        // 2. Se identificou a coluna, tenta novamente mantendo todas as outras colunas
        if (changed) {
          const retrySingle = await supabase
            .from('profiles')
            .upsert(payload, { onConflict: 'id' })
            .select()
            .single();

          if (!retrySingle.error) {
            data = { ...retrySingle.data, ...body };
            error = null as any;
          } else {
            error = retrySingle.error;
          }
        }

        // 3. Fallback de segurança amplo apenas se o erro persistir
        if (error) {
          for (const col of candidateColumns) {
            delete (payload as any)[col];
          }
          const retryAll = await supabase
            .from('profiles')
            .upsert(payload, { onConflict: 'id' })
            .select()
            .single();

          if (retryAll.error) throw retryAll.error;
          data = { ...retryAll.data, ...body };
        }
      }
      return data;
    }

    // Atualizar Metas
    if (endpoint === '/api/profile/targets') {
      const { data, error } = await supabase
        .from('daily_targets')
        .upsert({ user_id: user!.id, ...body })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    // Editar Log de Alimento
    if (endpoint.startsWith('/api/food/log/')) {
      const id = endpoint.split('/').pop()!;
      const { data, error } = await supabase
        .from('food_logs')
        .update(body)
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  if (method === 'DELETE') {
    // Deletar Log de Alimento
    if (endpoint.startsWith('/api/food/log/')) {
      const id = endpoint.split('/').pop()!;
      const { error } = await supabase
        .from('food_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
      return { deleted: true };
    }

    // Deletar Favorito
    if (endpoint.startsWith('/api/food/favorites/')) {
      const foodId = endpoint.split('/').pop()!;
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user!.id)
        .or(`food_master_id.eq.${foodId},food_custom_id.eq.${foodId}`);
      if (error) throw error;
      return { deleted: true };
    }

    // Deletar Treino
    if (endpoint.startsWith('/api/exercises/log/')) {
      const id = endpoint.split('/').pop()!;
      const { error } = await supabase
        .from('exercise_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
      return { deleted: true };
    }
  }

  return null;
}

export const api = {
  // GET: Cache-first com fallback offline
  get: async (endpoint: string, params?: any) => {
    const cacheKey = buildCacheKey(endpoint, params);

    try {
      const data = await executeSupabaseGet(endpoint, params);
      if (data !== null) {
        await cacheSet(cacheKey, data);
        return data;
      }
      throw new Error(`Endpoint não encontrado: ${endpoint}`);
    } catch (e) {
      const cached = await cacheGet(cacheKey);
      if (cached !== null) {
        console.log(`[Offline] Servindo cache: ${cacheKey}`);
        return cached;
      }
      throw e;
    }
  },

  // POST: Fila de mutação em caso de offline
  post: async (endpoint: string, body: any) => {
    try {
      const data = await executeSupabaseMutation('POST', endpoint, body);
      const keys = getInvalidationKeys(endpoint);
      for (const k of keys) await cacheInvalidate(k);
      emitEvents(endpoint, 'POST');
      return data;
    } catch (e) {
      const online = await checkOnline();
      if (!online) {
        await enqueue({ method: 'POST', endpoint, body });
        console.log(`[Offline] Enfileirado POST ${endpoint}`);
        emitEvents(endpoint, 'POST');
        return { _offline: true, _queued: true };
      }
      throw e;
    }
  },

  // PUT: Fila de mutação em caso de offline
  put: async (endpoint: string, body: any) => {
    try {
      const data = await executeSupabaseMutation('PUT', endpoint, body);
      const keys = getInvalidationKeys(endpoint);
      for (const k of keys) await cacheInvalidate(k);
      emitEvents(endpoint, 'PUT');
      return data;
    } catch (e) {
      const online = await checkOnline();
      if (!online) {
        await enqueue({ method: 'PUT', endpoint, body });
        console.log(`[Offline] Enfileirado PUT ${endpoint}`);
        emitEvents(endpoint, 'PUT');
        return { _offline: true, _queued: true };
      }
      throw e;
    }
  },

  // DELETE: Fila de mutação em caso de offline
  delete: async (endpoint: string) => {
    try {
      const data = await executeSupabaseMutation('DELETE', endpoint);
      const keys = getInvalidationKeys(endpoint);
      for (const k of keys) await cacheInvalidate(k);
      emitEvents(endpoint, 'DELETE');
      return data;
    } catch (e) {
      const online = await checkOnline();
      if (!online) {
        await enqueue({ method: 'DELETE', endpoint });
        console.log(`[Offline] Enfileirado DELETE ${endpoint}`);
        emitEvents(endpoint, 'DELETE');
        return { _offline: true, _queued: true };
      }
      throw e;
    }
  },
};
