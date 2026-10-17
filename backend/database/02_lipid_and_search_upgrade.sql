-- ========================================================================
-- 🚀 PROJETO EMAGRECIMENTO (Akilo)
-- MIGRATION 02: UPGRADE DE PERFIL LIPÍDICO COMPLETO & BUSCA INTELIGENTE V2
-- ========================================================================
-- 1. Expansão de ácidos graxos (Saturada, Mono, Poli, Trans, Colesterol)
-- 2. Categorias e grupos de alimentos padronizados
-- 3. Metas de gordura saturada (OMS / SBC) em daily_targets
-- 4. Função RPC search_foods_v2 com ranking de relevância por camadas
-- ========================================================================

-- ------------------------------------------------------------------------
-- 0. EXTENSÕES NECESSÁRIAS
-- ------------------------------------------------------------------------
create extension if not exists "unaccent";
create extension if not exists "pg_trgm";

-- ------------------------------------------------------------------------
-- 1. ATUALIZAÇÃO DO CHECK CONSTRAINT DE SOURCES
-- ------------------------------------------------------------------------
alter table public.foods_master drop constraint if exists foods_master_source_check;
alter table public.foods_master add constraint foods_master_source_check 
  check (source in ('tbca', 'taco', 'off', 'ibge', 'verified', 'community'));

-- ------------------------------------------------------------------------
-- 2. NOVAS COLUNAS LIPÍDICAS E CATEGORIA EM FOODS_MASTER
-- ------------------------------------------------------------------------
alter table public.foods_master add column if not exists category text;
alter table public.foods_master add column if not exists saturated_fats_g numeric(10,2) default 0 check (saturated_fats_g is null or saturated_fats_g >= 0);
alter table public.foods_master add column if not exists monounsaturated_fats_g numeric(10,2) default 0 check (monounsaturated_fats_g is null or monounsaturated_fats_g >= 0);
alter table public.foods_master add column if not exists polyunsaturated_fats_g numeric(10,2) default 0 check (polyunsaturated_fats_g is null or polyunsaturated_fats_g >= 0);
alter table public.foods_master add column if not exists trans_fats_g numeric(10,2) default 0 check (trans_fats_g is null or trans_fats_g >= 0);
alter table public.foods_master add column if not exists cholesterol_mg numeric(10,2) default 0 check (cholesterol_mg is null or cholesterol_mg >= 0);

create index if not exists idx_foods_master_category on public.foods_master(category);

-- ------------------------------------------------------------------------
-- 3. NOVAS COLUNAS LIPÍDICAS EM FOODS_CUSTOM
-- ------------------------------------------------------------------------
alter table public.foods_custom add column if not exists category text;
alter table public.foods_custom add column if not exists saturated_fats_g numeric(10,2) default 0 check (saturated_fats_g is null or saturated_fats_g >= 0);
alter table public.foods_custom add column if not exists monounsaturated_fats_g numeric(10,2) default 0 check (monounsaturated_fats_g is null or monounsaturated_fats_g >= 0);
alter table public.foods_custom add column if not exists polyunsaturated_fats_g numeric(10,2) default 0 check (polyunsaturated_fats_g is null or polyunsaturated_fats_g >= 0);
alter table public.foods_custom add column if not exists trans_fats_g numeric(10,2) default 0 check (trans_fats_g is null or trans_fats_g >= 0);
alter table public.foods_custom add column if not exists cholesterol_mg numeric(10,2) default 0 check (cholesterol_mg is null or cholesterol_mg >= 0);

-- ------------------------------------------------------------------------
-- 4. NOVAS COLUNAS LIPÍDICAS EM FOOD_LOGS (DIÁRIO ALIMENTAR)
-- ------------------------------------------------------------------------
alter table public.food_logs add column if not exists category text;
alter table public.food_logs add column if not exists saturated_fats_g numeric(10,2) default 0 check (saturated_fats_g is null or saturated_fats_g >= 0);
alter table public.food_logs add column if not exists monounsaturated_fats_g numeric(10,2) default 0 check (monounsaturated_fats_g is null or monounsaturated_fats_g >= 0);
alter table public.food_logs add column if not exists polyunsaturated_fats_g numeric(10,2) default 0 check (polyunsaturated_fats_g is null or polyunsaturated_fats_g >= 0);
alter table public.food_logs add column if not exists trans_fats_g numeric(10,2) default 0 check (trans_fats_g is null or trans_fats_g >= 0);
alter table public.food_logs add column if not exists cholesterol_mg numeric(10,2) default 0 check (cholesterol_mg is null or cholesterol_mg >= 0);

-- ------------------------------------------------------------------------
-- 5. META DE GORDURA SATURADA (OMS / SBC) EM DAILY_TARGETS
-- ------------------------------------------------------------------------
alter table public.daily_targets add column if not exists saturated_fats_target_g int not null default 20 check (saturated_fats_target_g >= 0);

-- ------------------------------------------------------------------------
-- 6. FUNÇÃO RPC INTELIGENTE: SEARCH_FOODS_V2 (COM RANKING DE RELEVÂNCIA)
-- ------------------------------------------------------------------------
create or replace function public.search_foods_v2(
  search_term text,
  p_limit int default 40,
  p_category text default null
)
returns table (
  id uuid,
  name text,
  brand text,
  category text,
  unit_type text,
  base_qty numeric,
  serving_description text,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fats_g numeric,
  saturated_fats_g numeric,
  monounsaturated_fats_g numeric,
  polyunsaturated_fats_g numeric,
  trans_fats_g numeric,
  cholesterol_mg numeric,
  fiber_g numeric,
  sodium_mg numeric,
  source text,
  source_id text,
  barcode text,
  is_incomplete boolean,
  relevance float
) language sql stable as $$
  select
    id, name, brand, category, unit_type, base_qty, serving_description,
    calories, protein_g, carbs_g, fats_g,
    coalesce(saturated_fats_g, 0),
    coalesce(monounsaturated_fats_g, 0),
    coalesce(polyunsaturated_fats_g, 0),
    coalesce(trans_fats_g, 0),
    coalesce(cholesterol_mg, 0),
    fiber_g, sodium_mg,
    source, source_id, barcode, is_incomplete,
    (
      case
        -- 1. Match Exato com o nome do alimento (desconsiderando acento e caixa)
        when unaccent(lower(name)) = unaccent(lower(search_term)) then 150.0

        -- 2. Alimento começa com o termo (ex: "Arroz..." ou "Peito de Frango...")
        when unaccent(lower(name)) like unaccent(lower(search_term)) || '%' then 100.0

        -- 3. Nome principal antes da vírgula contém o termo isolado
        when unaccent(lower(split_part(name, ',', 1))) like '%' || unaccent(lower(search_term)) || '%' then 75.0

        -- 4. Termo aparece como palavra isolada no início de qualquer palavra
        when unaccent(lower(name)) like '% ' || unaccent(lower(search_term)) || '%' then 50.0

        -- 5. Termo genérico secundário (via similaridade trigram)
        else similarity(unaccent(lower(name)), unaccent(lower(search_term))) * 30.0
      end
      -- Bônus de relevância para bases com nomes puros e diretos (TACO e curadoria Verified)
      + case when source = 'taco' then 25.0 else 0.0 end
      + case when source = 'verified' then 30.0 else 0.0 end
      -- Penaliza levemente itens com nomes excessivamente longos (favorece ingredientes puros)
      - (least(length(name), 120) * 0.15)
      -- Penaliza receitas com parênteses onde o termo só existe como ingrediente secundário na massa
      - case when name like '%(%' and position(lower(search_term) in lower(split_part(name, '(', 1))) = 0 then 25.0 else 0.0 end
    ) as relevance
  from public.foods_master
  where
    (p_category is null or p_category = '' or category ilike '%' || p_category || '%')
    and (
      unaccent(lower(name)) ilike '%' || unaccent(lower(search_term)) || '%'
      or unaccent(lower(coalesce(brand, ''))) ilike '%' || unaccent(lower(search_term)) || '%'
      or similarity(unaccent(lower(name)), unaccent(lower(search_term))) > 0.18
    )
  order by relevance desc
  limit p_limit;
$$;
