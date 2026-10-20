import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../core/supabase';
import { hasCompletedOnboarding } from '../core/onboarding';

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    async function determineRoute() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setTarget('/(auth)/login');
          return;
        }

        const completed = await hasCompletedOnboarding(session.user.id);
        if (!completed) {
          setTarget('/(auth)/onboarding');
        } else {
          setTarget('/(tabs)');
        }
      } catch {
        setTarget('/(auth)/login');
      }
    }

    determineRoute();
  }, []);

  if (!target) {
    return (
      <View style={{ flex: 1, backgroundColor: '#040d09', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return <Redirect href={target as any} />;
}
