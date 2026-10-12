import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const ONBOARDING_KEY_PREFIX = 'onboarding_completed_';

export const hasCompletedOnboarding = async (userId: string): Promise<boolean> => {
  try {
    // 1. Checagem rápida em cache local
    let localCompleted = false;
    if (Platform.OS === 'web') {
      localCompleted = localStorage.getItem(`${ONBOARDING_KEY_PREFIX}${userId}`) === 'true';
    } else {
      const value = await AsyncStorage.getItem(`${ONBOARDING_KEY_PREFIX}${userId}`);
      localCompleted = value === 'true';
    }

    if (localCompleted) return true;

    // 2. Se local estiver falso, consulta perfil no Supabase
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data?.onboarding_completed) {
      // Sincroniza cache local
      if (Platform.OS === 'web') {
        localStorage.setItem(`${ONBOARDING_KEY_PREFIX}${userId}`, 'true');
      } else {
        await AsyncStorage.setItem(`${ONBOARDING_KEY_PREFIX}${userId}`, 'true');
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error('Erro ao verificar status de onboarding:', error);
    return false;
  }
};

export const markOnboardingComplete = async (userId: string): Promise<void> => {
  try {
    // Grava localmente
    if (Platform.OS === 'web') {
      localStorage.setItem(`${ONBOARDING_KEY_PREFIX}${userId}`, 'true');
    } else {
      await AsyncStorage.setItem(`${ONBOARDING_KEY_PREFIX}${userId}`, 'true');
    }

    // Persiste no Supabase para nunca perder entre aparelhos
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', userId);

    console.log('Onboarding marcado como concluído com sucesso para o usuário:', userId);
  } catch (error) {
    console.error('Erro ao marcar onboarding como concluído:', error);
  }
};

export const clearOnboardingStatus = async (userId: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(`${ONBOARDING_KEY_PREFIX}${userId}`);
    } else {
      await AsyncStorage.removeItem(`${ONBOARDING_KEY_PREFIX}${userId}`);
    }
  } catch (error) {
    console.error('Erro ao limpar status de onboarding:', error);
  }
};
