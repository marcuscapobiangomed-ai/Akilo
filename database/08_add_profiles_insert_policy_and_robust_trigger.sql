-- ========================================================================
-- Migration: Add profiles INSERT policy & Robust handle_new_user trigger
-- ========================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'profiles_insert_own'
  ) THEN
    CREATE POLICY "profiles_insert_own" ON public.profiles 
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 1) Criar perfil inicial
  BEGIN
    INSERT INTO public.profiles (
      id, 
      name, 
      sex,
      age, 
      height_cm, 
      weight_kg, 
      activity_level, 
      goal_type,
      weekly_workouts_target,
      onboarding_completed
    )
    VALUES (
      new.id,
      COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'name'), ''), 'Novo Atleta'),
      COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'sex'), ''), 'male'),
      25,
      170,
      70.0,
      'medium',
      'maintain',
      3,
      false
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user profiles error: %', SQLERRM;
  END;

  -- 2) Criar metas diárias padrão
  BEGIN
    INSERT INTO public.daily_targets (
      user_id,
      calories_target,
      protein_target_g,
      carbs_target_g,
      fats_target_g,
      fiber_target_g,
      water_target_ml
    )
    VALUES (
      new.id,
      2000,
      120,
      250,
      60,
      25,
      2500
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user daily_targets error: %', SQLERRM;
  END;

  -- 3) Inicializar streak
  BEGIN
    INSERT INTO public.streaks (user_id, current_streak, best_streak, last_completed_date)
    VALUES (
      new.id,
      0,
      0,
      null
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user streaks error: %', SQLERRM;
  END;

  RETURN new;
END;
$$;
