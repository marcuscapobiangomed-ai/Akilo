-- ------------------------------------------------------------------------
-- Migration 05: Suporte a Linha de Base Completa de Bioimpedância no Perfil
-- Permite comparar a 1ª Bioimpedância com a mais recente (Deltas de Sucesso/Alerta)
-- ------------------------------------------------------------------------

alter table public.profiles
  add column if not exists initial_muscle_mass_pct numeric(4,1) check (initial_muscle_mass_pct is null or (initial_muscle_mass_pct between 5 and 70)),
  add column if not exists initial_checkin_date date;
