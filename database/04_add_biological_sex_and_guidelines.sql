-- ========================================================================
-- 🚀 PROJETO EMAGRECIMENTO (Akilo)
-- MIGRATION 04: SEXO BIOLÓGICO, DIRETRIZES BRASILEIRAS (ABESO/SBC) & NOVA
-- ========================================================================
-- 1. Coluna de sexo biológico em profiles para BMR e gordura corporal
-- 2. Coluna da Classificação NOVA do Ministério da Saúde em alimentos
-- ========================================================================

-- 1. Sexo Biológico em profiles (Necessário para BMR Mifflin-St Jeor)
alter table public.profiles
  add column if not exists sex text not null default 'male' check (sex in ('male', 'female'));

-- 2. Classificação NOVA (Guia Alimentar para a População Brasileira - Ministério da Saúde)
-- 1 = Alimentos in natura ou minimamente processados
-- 2 = Ingredientes culinários processados (óleos, gorduras, sal, açúcar)
-- 3 = Alimentos processados (conservas, queijos, pães artesanais)
-- 4 = Alimentos ultraprocessados (refrigerantes, snacks, embutidos industriais)
alter table public.foods_master
  add column if not exists nova_group int check (nova_group is null or nova_group between 1 and 4);

alter table public.foods_custom
  add column if not exists nova_group int check (nova_group is null or nova_group between 1 and 4);

alter table public.food_logs
  add column if not exists nova_group int check (nova_group is null or nova_group between 1 and 4);
