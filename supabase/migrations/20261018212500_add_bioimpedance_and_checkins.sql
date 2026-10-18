-- ========================================================================
-- Migration: Adiciona Colunas de Bioimpedância e Tabela body_checkins
-- ========================================================================

-- 1. Colunas de Bioimpedância, Mascote e Check-in na tabela profiles
alter table public.profiles
  add column if not exists body_fat_pct numeric(4,1) check (body_fat_pct is null or (body_fat_pct between 3 and 70)),
  add column if not exists muscle_mass_pct numeric(4,1) check (muscle_mass_pct is null or (muscle_mass_pct between 5 and 90)),
  add column if not exists body_water_pct numeric(4,1) check (body_water_pct is null or (body_water_pct between 20 and 85)),
  add column if not exists basal_metabolism_kcal int check (basal_metabolism_kcal is null or basal_metabolism_kcal > 0),
  add column if not exists metabolic_age int check (metabolic_age is null or metabolic_age > 0),
  add column if not exists avatar_mascot_id text not null default 'tita' check (avatar_mascot_id in ('tita', 'gaia')),
  add column if not exists waist_cm numeric(4,1) check (waist_cm is null or (waist_cm between 40 and 200)),
  add column if not exists initial_weight_kg numeric(5,2) check (initial_weight_kg is null or initial_weight_kg > 0),
  add column if not exists initial_body_fat_pct numeric(4,1) check (initial_body_fat_pct is null or (initial_body_fat_pct between 3 and 70)),
  add column if not exists initial_waist_cm numeric(4,1) check (initial_waist_cm is null or (initial_waist_cm between 40 and 200)),
  add column if not exists initial_muscle_mass_pct numeric(4,1) check (initial_muscle_mass_pct is null or (initial_muscle_mass_pct between 5 and 70)),
  add column if not exists initial_checkin_date date,
  add column if not exists avatar_customization jsonb default null,
  add column if not exists sex text not null default 'male' check (sex in ('male', 'female')),
  add column if not exists checkin_frequency_days int not null default 7 check (checkin_frequency_days in (7, 14, 30)),
  add column if not exists preferred_checkin_weekday int not null default 1 check (preferred_checkin_weekday between 0 and 6),
  add column if not exists last_checkin_date date,
  add column if not exists last_skipped_checkin_date date;

-- 2. Colunas de Bioimpedância na tabela weight_logs
alter table public.weight_logs
  add column if not exists body_fat_pct numeric(4,1),
  add column if not exists muscle_mass_pct numeric(4,1),
  add column if not exists body_water_pct numeric(4,1),
  add column if not exists waist_cm numeric(4,1),
  add column if not exists basal_metabolism_kcal int,
  add column if not exists metabolic_age int;

-- 3. Tabela de histórico oficial de Check-ins Corporais (body_checkins)
create table if not exists public.body_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric(5,2) not null check (weight_kg > 0),
  bmi numeric(4,1),
  body_fat_pct numeric(4,1),
  muscle_mass_pct numeric(4,1),
  body_water_pct numeric(4,1),
  basal_metabolism_kcal int,
  metabolic_age int,
  waist_cm numeric(4,1),
  notes text,
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

create index if not exists idx_body_checkins_user_date on public.body_checkins(user_id, date);

alter table public.body_checkins enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'body_checkins' and policyname = 'body_checkins_all_own'
  ) then
    create policy "body_checkins_all_own" on public.body_checkins
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- 4. Classificação NOVA nos alimentos
alter table public.foods_master
  add column if not exists nova_group int check (nova_group is null or nova_group between 1 and 4);

alter table public.foods_custom
  add column if not exists nova_group int check (nova_group is null or nova_group between 1 and 4);

alter table public.food_logs
  add column if not exists nova_group int check (nova_group is null or nova_group between 1 and 4);
