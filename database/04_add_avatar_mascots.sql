-- ------------------------------------------------------------------------
-- Migration 04: Sistema de Mascotes de Bioimpedância & Medidas Corporais
-- "Batalha da Balança" - Titã & Gaia com Evolução Dinâmica por Bioimpedância
-- ------------------------------------------------------------------------

-- 1. Suporte a mascote escolhido e medidas antropométricas no perfil
alter table public.profiles
  add column if not exists avatar_mascot_id text not null default 'tita' check (avatar_mascot_id in ('tita', 'gaia')),
  add column if not exists waist_cm numeric(4,1) check (waist_cm is null or (waist_cm between 40 and 200)),
  add column if not exists initial_weight_kg numeric(5,2) check (initial_weight_kg is null or initial_weight_kg > 0),
  add column if not exists initial_body_fat_pct numeric(4,1) check (initial_body_fat_pct is null or (initial_body_fat_pct between 3 and 70)),
  add column if not exists initial_waist_cm numeric(4,1) check (initial_waist_cm is null or (initial_waist_cm between 40 and 200));

-- 2. Suporte a medidas de cintura e circunferências na tabela de check-ins periódicos
alter table public.body_checkins
  add column if not exists waist_cm numeric(4,1) check (waist_cm is null or (waist_cm between 40 and 200));
