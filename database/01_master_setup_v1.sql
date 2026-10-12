-- ========================================================================
-- 🚀 PROJETO EMAGRECIMENTO (iOS / React Native + Supabase)
-- MIGRATION CONSOLIDADA v1.0 — BANCO DE DADOS & SEGURANÇA
-- ========================================================================
-- Inclui:
-- 1. Extensões essenciais (UUID, Trigram para busca tolerante em PT-BR)
-- 2. 13 Tabelas (Perfis, Metas, TBCA Expandida, Exercícios, Combos, Grupos, Desafios)
-- 3. Triggers automáticos (Timestamp, Criação de Perfil no Signup)
-- 4. Função de Exclusão de Conta (Conformidade LGPD & Apple Guideline 5.1.1(v))
-- 5. View Anti-Fraude de Ranking Semanal por Hábitos
-- 6. Políticas de Segurança RLS (Row Level Security) completas
-- 7. Catálogo inicial de modalidades de exercícios com METs
-- ========================================================================

-- ------------------------------------------------------------------------
-- 1. EXTENSÕES
-- ------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";

-- ------------------------------------------------------------------------
-- 2. TABELAS CENTRAIS
-- ------------------------------------------------------------------------

-- 2.1) PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  age int check (age > 0),
  height_cm int check (height_cm > 0),
  weight_kg numeric(5,2) check (weight_kg > 0),
  activity_level text not null default 'medium' check (activity_level in ('low', 'medium', 'high')),
  goal_type text not null default 'maintain' check (goal_type in ('maintain', 'fat_loss', 'muscle_gain')),
  weekly_workouts_target int not null default 3 check (weekly_workouts_target between 1 and 14),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2.2) DAILY TARGETS
create table if not exists public.daily_targets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calories_target int not null default 2000 check (calories_target > 0),
  protein_target_g int not null default 120 check (protein_target_g >= 0),
  carbs_target_g int not null default 250 check (carbs_target_g >= 0),
  fats_target_g int not null default 60 check (fats_target_g >= 0),
  fiber_target_g int not null default 25 check (fiber_target_g >= 0),
  water_target_ml int not null default 2500 check (water_target_ml >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create index if not exists idx_daily_targets_user_id on public.daily_targets(user_id);

-- 2.3) FOODS MASTER (TBCA + Open Food Facts)
create table if not exists public.foods_master (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  brand text,
  unit_type text not null default 'g' check (unit_type in ('g', 'ml', 'serving')),
  base_qty numeric(10,2) not null default 100 check (base_qty > 0),
  serving_description text, -- Ex: "1 colher de sopa (25g)", "1 concha média (130g)"
  
  -- Macronutrientes por base_qty (100g ou 100ml)
  calories numeric(10,2) not null default 0 check (calories >= 0),
  protein_g numeric(10,2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(10,2) not null default 0 check (carbs_g >= 0),
  fats_g numeric(10,2) not null default 0 check (fats_g >= 0),
  
  -- Qualidade nutricional expandida
  fiber_g numeric(10,2) default 0 check (fiber_g is null or fiber_g >= 0),
  sodium_mg numeric(10,2) default 0 check (sodium_mg is null or sodium_mg >= 0),
  
  -- Procedência e transparência
  source text not null default 'tbca' check (source in ('tbca', 'off', 'verified')),
  source_id text, -- ID TBCA ou código de barras no Open Food Facts
  barcode text,
  is_incomplete boolean not null default false,
  
  created_at timestamptz not null default now()
);

-- Índice Trigram para busca rápida tolerante a erros e acentos em português
create index if not exists idx_foods_master_trgm_name on public.foods_master using gin (name gin_trgm_ops);
create index if not exists idx_foods_master_barcode on public.foods_master(barcode) where barcode is not null;

-- 2.4) FOODS CUSTOM (Alimentos Criados pelo Usuário)
create table if not exists public.foods_custom (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand text,
  unit_type text not null default 'g' check (unit_type in ('g', 'ml', 'serving')),
  base_qty numeric(10,2) not null default 100 check (base_qty > 0),
  serving_description text,
  
  calories numeric(10,2) not null check (calories >= 0),
  protein_g numeric(10,2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(10,2) not null default 0 check (carbs_g >= 0),
  fats_g numeric(10,2) not null default 0 check (fats_g >= 0),
  fiber_g numeric(10,2) default 0 check (fiber_g is null or fiber_g >= 0),
  sodium_mg numeric(10,2) default 0 check (sodium_mg is null or sodium_mg >= 0),
  barcode text,
  
  created_at timestamptz not null default now()
);

create index if not exists idx_foods_custom_user_id on public.foods_custom(user_id);
create index if not exists idx_foods_custom_trgm_name on public.foods_custom using gin (name gin_trgm_ops);

-- 2.5) FOOD LOGS (Diário Alimentar)
create table if not exists public.food_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'snacks', 'dinner')),
  
  food_source text not null check (food_source in ('master', 'custom', 'manual')),
  food_master_id uuid references public.foods_master(id) on delete set null,
  food_custom_id uuid references public.foods_custom(id) on delete set null,
  
  food_name text not null,
  brand text,
  qty numeric(10,2) not null check (qty > 0),
  unit_type text not null default 'g',
  
  -- Valores calculados para a porção consumida
  calories numeric(10,2) not null check (calories >= 0),
  protein_g numeric(10,2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(10,2) not null default 0 check (carbs_g >= 0),
  fats_g numeric(10,2) not null default 0 check (fats_g >= 0),
  fiber_g numeric(10,2) default 0 check (fiber_g is null or fiber_g >= 0),
  sodium_mg numeric(10,2) default 0 check (sodium_mg is null or sodium_mg >= 0),
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_food_logs_user_date on public.food_logs(user_id, date);
create index if not exists idx_food_logs_meal_type on public.food_logs(meal_type);

-- 2.6) WATER LOGS
create table if not exists public.water_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  amount_ml int not null check (amount_ml > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_water_logs_user_date on public.water_logs(user_id, date);

-- 2.7) WEIGHT LOGS (Balança)
create table if not exists public.weight_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric(5,2) not null check (weight_kg > 0),
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

create index if not exists idx_weight_logs_user_date on public.weight_logs(user_id, date);

-- 2.8) FAVORITES
create table if not exists public.favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_master_id uuid references public.foods_master(id) on delete cascade,
  food_custom_id uuid references public.foods_custom(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favorites_one_source check (
    (food_master_id is not null and food_custom_id is null)
    or
    (food_master_id is null and food_custom_id is not null)
  )
);

create index if not exists idx_favorites_user_id on public.favorites(user_id);

-- 2.9) MEAL TEMPLATES (Combos e Refeições Salvas — Registro Rápido)
create table if not exists public.meal_templates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, -- Ex: "Café da Manhã Padrão", "Almoço Semanal"
  default_meal_type text check (default_meal_type in ('breakfast', 'lunch', 'snacks', 'dinner')),
  created_at timestamptz not null default now()
);

create index if not exists idx_meal_templates_user_id on public.meal_templates(user_id);

create table if not exists public.meal_template_items (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references public.meal_templates(id) on delete cascade,
  food_source text not null check (food_source in ('master', 'custom')),
  food_master_id uuid references public.foods_master(id) on delete cascade,
  food_custom_id uuid references public.foods_custom(id) on delete cascade,
  food_name text not null,
  qty numeric(10,2) not null check (qty > 0),
  unit_type text not null default 'g',
  calories numeric(10,2) not null default 0,
  protein_g numeric(10,2) not null default 0,
  carbs_g numeric(10,2) not null default 0,
  fats_g numeric(10,2) not null default 0,
  fiber_g numeric(10,2) default 0
);

create index if not exists idx_meal_template_items_template on public.meal_template_items(template_id);

-- 2.10) EXERCISES MASTER (Catálogo com METs Científicos)
create table if not exists public.exercises_master (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null check (category in ('cardio', 'strength', 'mobility', 'sports', 'other')),
  met_value numeric(4,2) not null check (met_value > 0),
  icon text,
  created_at timestamptz not null default now()
);

create index if not exists idx_exercises_master_trgm_name on public.exercises_master using gin (name gin_trgm_ops);

-- 2.11) EXERCISE LOGS (Diário de Treinos)
create table if not exists public.exercise_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_master_id uuid references public.exercises_master(id) on delete set null,
  exercise_name text not null,
  date date not null,
  duration_minutes int not null check (duration_minutes > 0),
  calories_burned numeric(7,2) not null default 0 check (calories_burned >= 0),
  perceived_exertion int check (perceived_exertion between 1 and 10),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_exercise_logs_user_date on public.exercise_logs(user_id, date);

-- 2.12) GROUPS & GROUP MEMBERS (Comunidade & Desafios)
create table if not exists public.groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  invite_code text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_groups_invite_code on public.groups(invite_code);

create table if not exists public.group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  share_workouts boolean not null default true,
  share_consistency boolean not null default true,
  share_weight boolean not null default false, -- PRIVACIDADE: Peso privado por padrão!
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

create index if not exists idx_group_members_group_user on public.group_members(group_id, user_id);

-- 2.13) CHALLENGES
create table if not exists public.challenges (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  description text,
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('upcoming', 'active', 'completed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_challenges_group on public.challenges(group_id);

-- 2.14) STREAKS
create table if not exists public.streaks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  current_streak int not null default 0 check (current_streak >= 0),
  best_streak int not null default 0 check (best_streak >= 0),
  last_completed_date date,
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create index if not exists idx_streaks_user_id on public.streaks(user_id);


-- ------------------------------------------------------------------------
-- 3. VIEW DE RANKING SEMANAL ANTI-FRAUDE (Calculado no Servidor)
-- ------------------------------------------------------------------------
-- Pontuação por Hábitos Saudáveis:
-- +10 pts por dia com diário alimentar consistente (>= 2 refeições registradas)
-- +10 pts por dia com treino válido (>= 20 minutos)
-- +5 pts por dia com meta de água atingida
-- ZERO pontos para perda de peso ou restrição calórica agressiva
create or replace view public.view_weekly_habit_leaderboard as
with date_bounds as (
  select 
    date_trunc('week', current_date)::date as week_start,
    (date_trunc('week', current_date) + interval '6 days')::date as week_end
),
user_food_days as (
  select 
    fl.user_id,
    fl.date,
    count(distinct fl.meal_type) as meals_count
  from public.food_logs fl
  cross join date_bounds b
  where fl.date between b.week_start and b.week_end
  group by fl.user_id, fl.date
  having count(distinct fl.meal_type) >= 2
),
user_exercise_days as (
  select 
    el.user_id,
    el.date,
    sum(el.duration_minutes) as total_minutes
  from public.exercise_logs el
  cross join date_bounds b
  where el.date between b.week_start and b.week_end
  group by el.user_id, el.date
  having sum(el.duration_minutes) >= 20
),
user_water_days as (
  select 
    wl.user_id,
    wl.date,
    sum(wl.amount_ml) as total_water
  from public.water_logs wl
  cross join date_bounds b
  join public.daily_targets dt on dt.user_id = wl.user_id
  where wl.date between b.week_start and b.week_end
  group by wl.user_id, wl.date, dt.water_target_ml
  having sum(wl.amount_ml) >= (dt.water_target_ml * 0.8) -- 80% ou mais da meta
)
select 
  p.id as user_id,
  p.name as user_name,
  coalesce(count(distinct ufd.date), 0)::int as food_logged_days,
  coalesce(count(distinct ued.date), 0)::int as exercise_days,
  coalesce(count(distinct uwd.date), 0)::int as water_goal_days,
  (
    (coalesce(count(distinct ufd.date), 0) * 10) +
    (coalesce(count(distinct ued.date), 0) * 10) +
    (coalesce(count(distinct uwd.date), 0) * 5)
  )::int as total_habit_points
from public.profiles p
left join user_food_days ufd on ufd.user_id = p.id
left join user_exercise_days ued on ued.user_id = p.id
left join user_water_days uwd on uwd.user_id = p.id
group by p.id, p.name;


-- ------------------------------------------------------------------------
-- 4. FUNÇÕES E TRIGGERS
-- ------------------------------------------------------------------------

-- 4.1) Trigger de Updated_at automático
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_daily_targets_updated on public.daily_targets;
create trigger trg_daily_targets_updated
before update on public.daily_targets
for each row execute function public.set_updated_at();

drop trigger if exists trg_food_logs_updated on public.food_logs;
create trigger trg_food_logs_updated
before update on public.food_logs
for each row execute function public.set_updated_at();

-- 4.2) Gerador de Código de Convite de 6 Dígitos para Grupos
create or replace function public.generate_group_invite_code()
returns text as $$
declare
  chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  code text := '';
  i int;
begin
  for i in 1..6 loop
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return code;
end;
$$ language plpgsql;

-- 4.3) Criação Automática de Perfil + Metas no Cadastro (Supabase Auth Trigger)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- 1) Criar perfil inicial (onboarding pendente)
  insert into public.profiles (
    id, 
    name, 
    age, 
    height_cm, 
    weight_kg, 
    activity_level, 
    goal_type,
    weekly_workouts_target,
    onboarding_completed
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Novo Usuário'),
    25,
    170,
    70.0,
    'medium',
    'maintain',
    3,
    false
  )
  on conflict (id) do nothing;

  -- 2) Criar metas diárias padrão
  insert into public.daily_targets (
    user_id,
    calories_target,
    protein_target_g,
    carbs_target_g,
    fats_target_g,
    fiber_target_g,
    water_target_ml
  )
  values (
    new.id,
    2000,
    120,
    250,
    60,
    25,
    2500
  )
  on conflict (user_id) do nothing;

  -- 3) Inicializar streak
  insert into public.streaks (user_id, current_streak, best_streak, last_completed_date)
  values (
    new.id,
    0,
    0,
    null
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 4.4) Exclusão Definitiva de Conta (Mandatório: Apple 5.1.1(v) & LGPD)
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Não autenticado';
  end if;

  -- Remove usuário de auth.users (cascateia profiles, logs, etc.)
  delete from auth.users where id = current_user_id;
end;
$$;


-- ------------------------------------------------------------------------
-- 5. POLÍTICAS DE SEGURANÇA RLS (ROW LEVEL SECURITY)
-- ------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.daily_targets enable row level security;
alter table public.foods_master enable row level security;
alter table public.foods_custom enable row level security;
alter table public.food_logs enable row level security;
alter table public.water_logs enable row level security;
alter table public.weight_logs enable row level security;
alter table public.favorites enable row level security;
alter table public.meal_templates enable row level security;
alter table public.meal_template_items enable row level security;
alter table public.exercises_master enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.challenges enable row level security;
alter table public.streaks enable row level security;

-- PROFILES: Usuário lê e edita o seu; membros do mesmo grupo podem ler nome e foto
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_select_group_members" on public.profiles for select using (
  exists (
    select 1 from public.group_members gm1
    join public.group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = auth.uid() and gm2.user_id = public.profiles.id
  )
);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- DAILY TARGETS: Privado
create policy "daily_targets_all_own" on public.daily_targets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- FOODS MASTER: Leitura pública
create policy "foods_master_read_all" on public.foods_master for select using (true);

-- FOODS CUSTOM: Privado
create policy "foods_custom_all_own" on public.foods_custom for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- FOOD LOGS: Privado
create policy "food_logs_all_own" on public.food_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- WATER LOGS: Privado
create policy "water_logs_all_own" on public.water_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- WEIGHT LOGS: Privado
create policy "weight_logs_all_own" on public.weight_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- FAVORITES: Privado
create policy "favorites_all_own" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- MEAL TEMPLATES & ITEMS: Privado
create policy "meal_templates_all_own" on public.meal_templates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "meal_template_items_all_own" on public.meal_template_items for all using (
  exists (select 1 from public.meal_templates t where t.id = template_id and t.user_id = auth.uid())
);

-- EXERCISES MASTER: Leitura pública
create policy "exercises_master_read_all" on public.exercises_master for select using (true);

-- EXERCISE LOGS: Usuário edita os seus; membros de grupos com permissão podem ver
create policy "exercise_logs_all_own" on public.exercise_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exercise_logs_select_group" on public.exercise_logs for select using (
  exists (
    select 1 from public.group_members gm1
    join public.group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = auth.uid() 
      and gm2.user_id = public.exercise_logs.user_id 
      and gm2.share_workouts = true
  )
);

-- GROUPS & MEMBERS
create policy "groups_select_members" on public.groups for select using (
  exists (select 1 from public.group_members where group_id = public.groups.id and user_id = auth.uid())
);
create policy "groups_insert" on public.groups for insert with check (auth.uid() = owner_id);
create policy "groups_update_owner" on public.groups for update using (auth.uid() = owner_id);

create policy "group_members_select" on public.group_members for select using (
  exists (select 1 from public.group_members gm where gm.group_id = public.group_members.group_id and gm.user_id = auth.uid())
);
create policy "group_members_insert" on public.group_members for insert with check (auth.uid() = user_id);
create policy "group_members_update_own" on public.group_members for update using (auth.uid() = user_id);
create policy "group_members_delete_own_or_admin" on public.group_members for delete using (
  auth.uid() = user_id or 
  exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
);

-- CHALLENGES
create policy "challenges_select" on public.challenges for select using (
  exists (select 1 from public.group_members where group_id = public.challenges.group_id and user_id = auth.uid())
);

-- STREAKS: Privado
create policy "streaks_all_own" on public.streaks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ------------------------------------------------------------------------
-- 6. SEED INICIAL: MODALIDADES DE EXERCÍCIOS & METs
-- ------------------------------------------------------------------------
insert into public.exercises_master (name, category, met_value, icon) values
  ('Caminhada moderada (5 km/h)', 'cardio', 3.8, 'Footprints'),
  ('Caminhada rápida / inclinação (6 km/h)', 'cardio', 5.0, 'Footprints'),
  ('Corrida leve / trote (8 km/h)', 'cardio', 7.0, 'Flame'),
  ('Corrida moderada (10 km/h)', 'cardio', 9.8, 'Flame'),
  ('Musculação (geral / descanso moderado)', 'strength', 5.0, 'Dumbbell'),
  ('Musculação intensa / circuitos', 'strength', 6.5, 'Dumbbell'),
  ('Ciclismo (ritmo moderado)', 'cardio', 6.0, 'Bike'),
  ('Ciclismo (ritmo intenso / spinning)', 'cardio', 8.5, 'Bike'),
  ('Natação (nado livre moderado)', 'cardio', 7.0, 'Waves'),
  ('Treino Funcional / HIIT', 'cardio', 8.0, 'Zap'),
  ('Pilates / Yoga', 'mobility', 3.0, 'Heart'),
  ('Alongamento / Mobilidade', 'mobility', 2.5, 'Activity'),
  ('Futebol / Futsal recreativo', 'sports', 7.5, 'Trophy'),
  ('Beach Tennis / Tênis', 'sports', 6.5, 'Trophy'),
  ('Lutas / Boxe / Muay Thai', 'sports', 8.5, 'Zap')
on conflict do nothing;

-- ========================================================================
-- ✅ FIM DO SCRIPT DE MIGRAÇÃO v1.0
-- ========================================================================
