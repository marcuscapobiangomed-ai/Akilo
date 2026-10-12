/**
 * api.ts
 * Camada de dados direta com Supabase PostgreSQL + RLS e Resiliência Offline.
 * Elimina 100% da necessidade de servidor intermediário (Custo R$ 0, sem cold-start).
 */

import { supabase } from './supabase';
import { cacheGet, cacheSet, cacheInvalidate, buildCacheKey, enqueue } from './cache';
import NetInfo from '@react-native-community/netinfo';
import { dataEvents } from './dataEvents';

const DEFAULT_TARGETS = {
  calories_target: 2000,
  protein_g_target: 140,
  protein_target_g: 140,
  carbs_g_target: 250,
  carbs_target_g: 250,
  fats_g_target: 60,
  fats_target_g: 60,
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
  '/api/water/': ['/api/water/', '/api/analytics/daily', '/api/analytics/weekly'],
  '/api/weight/': ['/api/weight/', '/api/analytics/daily', '/api/analytics/weekly'],
  '/api/exercises/': ['/api/exercises/log', '/api/analytics/daily', '/api/analytics/weekly'],
  '/api/food/favorites': ['/api/food/favorites'],
  '/api/food/custom': ['/api/food/custom', '/api/food/search'],
  '/api/profile/': ['/api/profile/', '/api/analytics/daily'],
  '/api/profile/targets': ['/api/profile/targets', '/api/analytics/daily', '/api/analytics/weekly'],
};

const EVENT_MAP: Record<string, string[]> = {
  '/api/food/log': ['food_logged'],
  '/api/water/': ['water_logged'],
  '/api/weight/': ['weight_logged'],
  '/api/exercises/': ['exercise_logged'],
  '/api/food/custom': ['food_logged'],
  '/api/food/favorites': ['food_logged'],
  '/api/profile/': ['profile_updated'],
  '/api/profile/targets': ['targets_updated'],
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
    return data || {};
  }

  // 2. Metas diárias
  if (endpoint === '/api/profile/targets') {
    if (!user) return DEFAULT_TARGETS;
    const { data } = await supabase.from('daily_targets').select('*').eq('user_id', user.id).maybeSingle();
    return data || DEFAULT_TARGETS;
  }

  // 3. Busca de Alimentos (TBCA + Custom)
  if (endpoint === '/api/food/search') {
    const q = (params?.q || '').trim();
    let masterQuery = supabase
      .from('foods_master')
      .select('id, name, brand, unit_type, base_qty, serving_description, calories, protein_g, carbs_g, fats_g, fiber_g, sodium_mg, source, source_id, is_incomplete')
      .order('calories', { ascending: false })
      .limit(30);

    if (q) {
      masterQuery = masterQuery.ilike('name', `%${q}%`);
    }

    const { data: masterData } = await masterQuery;

    let customData: any[] = [];
    if (user) {
      let customQuery = supabase.from('foods_custom').select('*').eq('user_id', user.id).limit(30);
      if (q) {
        customQuery = customQuery.ilike('name', `%${q}%`);
      }
      const { data } = await customQuery;
      customData = (data || []).map((f) => ({ ...f, is_custom: true }));
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
        .select('meal_type, food_source, food_master_id, food_custom_id, food_name, brand, qty, unit_type, calories, protein_g, carbs_g, fats_g, fiber_g, sodium_mg')
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
      const { data, error } = await supabase
        .from('weight_logs')
        .upsert({ user_id: user!.id, ...body }, { onConflict: 'user_id,date' })
        .select()
        .single();
      if (error) throw error;
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
  }

  if (method === 'PUT') {
    // Atualizar Perfil
    if (endpoint === '/api/profile/') {
      const { data, error } = await supabase
        .from('profiles')
        .update(body)
        .eq('id', user!.id)
        .select()
        .single();
      if (error) throw error;
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
