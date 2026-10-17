-- ------------------------------------------------------------------------
-- Migration: Campos de Bioimpedância & Composição Corporal
-- Aplicação de Emagrecimento iOS
-- ------------------------------------------------------------------------

alter table public.profiles
  add column if not exists body_fat_pct numeric(4,1),
  add column if not exists muscle_mass_pct numeric(4,1),
  add column if not exists body_water_pct numeric(4,1),
  add column if not exists basal_metabolism_kcal int,
  add column if not exists metabolic_age int;

alter table public.weight_logs
  add column if not exists body_fat_pct numeric(4,1),
  add column if not exists muscle_mass_pct numeric(4,1),
  add column if not exists body_water_pct numeric(4,1);
