-- ------------------------------------------------------------------------
-- Migration 06: Suporte a Super-Personalização 3D do Avatar (Titã & Gaia)
-- Permite ao usuário customizar cor dos olhos, luvas, traje, faixa/tiara e pele
-- ------------------------------------------------------------------------

alter table public.profiles
  add column if not exists avatar_customization jsonb default null;
