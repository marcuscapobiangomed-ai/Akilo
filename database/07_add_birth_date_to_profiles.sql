-- ========================================================================
-- Migration 07: Adiciona Coluna birth_date na Tabela profiles
-- ========================================================================

alter table public.profiles
  add column if not exists birth_date date;
