-- ========================================================================
-- Migration: Adiciona Coluna birth_date na Tabela profiles
-- Permite persistência nativa de data de nascimento para cálculo metabólico
-- ========================================================================

alter table public.profiles
  add column if not exists birth_date date;
