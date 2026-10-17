-- ------------------------------------------------------------------------
-- Migration 03: Sistema de Check-in Periódico de Bioimpedância & Peso
-- Frequência Configurável (Semanal, Quinzenal, Mensal) + Botão de Pular
-- Pilha Central da Competição entre Amigos (+15 pts na semana)
-- ------------------------------------------------------------------------

-- 1. Novas colunas de preferência de check-in na tabela profiles
alter table public.profiles
  add column if not exists checkin_frequency_days int not null default 7 check (checkin_frequency_days in (7, 14, 30)),
  add column if not exists preferred_checkin_weekday int not null default 1 check (preferred_checkin_weekday between 0 and 6),
  add column if not exists last_checkin_date date,
  add column if not exists last_skipped_checkin_date date;

-- 2. Tabela de histórico oficial de Check-ins Corporais
create table if not exists public.body_checkins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric(5,2) not null check (weight_kg > 0),
  bmi numeric(4,1),
  body_fat_pct numeric(4,1),
  muscle_mass_pct numeric(4,1),
  body_water_pct numeric(4,1),
  basal_metabolism_kcal int,
  metabolic_age int,
  notes text,
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

create index if not exists idx_body_checkins_user_date on public.body_checkins(user_id, date);

-- 3. Habilita RLS na tabela de check-ins
alter table public.body_checkins enable row level security;
create policy "body_checkins_all_own" on public.body_checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. Atualização da View Anti-Fraude com +15 pts pelo Check-in da semana
drop view if exists public.view_weekly_habit_leaderboard;
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
  having sum(wl.amount_ml) >= (dt.water_target_ml * 0.8)
),
user_checkin_status as (
  select
    bc.user_id,
    count(bc.id) as checkin_count,
    max(bc.date) as latest_checkin_date
  from public.body_checkins bc
  cross join date_bounds b
  where bc.date between b.week_start and b.week_end
  group by bc.user_id
)
select 
  p.id as user_id,
  p.name as user_name,
  coalesce(count(distinct ufd.date), 0)::int as food_logged_days,
  coalesce(count(distinct ued.date), 0)::int as exercise_days,
  coalesce(count(distinct uwd.date), 0)::int as water_goal_days,
  coalesce(ucs.checkin_count, 0)::int as checkin_done_this_week,
  ucs.latest_checkin_date,
  (
    (coalesce(count(distinct ufd.date), 0) * 10) +
    (coalesce(count(distinct ued.date), 0) * 10) +
    (coalesce(count(distinct uwd.date), 0) * 5) +
    (case when coalesce(ucs.checkin_count, 0) > 0 then 15 else 0 end) +
    (case when coalesce(count(distinct ufd.date), 0) >= 5 or coalesce(count(distinct ued.date), 0) >= 5 then 20 else 0 end)
  )::int as total_habit_points
from public.profiles p
left join user_food_days ufd on ufd.user_id = p.id
left join user_exercise_days ued on ued.user_id = p.id
left join user_water_days uwd on uwd.user_id = p.id
left join user_checkin_status ucs on ucs.user_id = p.id
group by p.id, p.name, ucs.checkin_count, ucs.latest_checkin_date;
