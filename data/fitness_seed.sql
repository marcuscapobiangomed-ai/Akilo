-- SEED FITNESS & SUPLEMENTAÇÃO NACIONAL CURADA COM CLASSIFICAÇÃO NOVA
-- Categoria: verified (Whey, Creatina, Barras, Bebidas Proteicas) & Guia Alimentar (MS)
INSERT INTO public.foods_master (name, brand, category, unit_type, base_qty, serving_description, calories, protein_g, carbs_g, fats_g, saturated_fats_g, monounsaturated_fats_g, polyunsaturated_fats_g, trans_fats_g, cholesterol_mg, fiber_g, sodium_mg, source, source_id, is_incomplete, nova_group)
VALUES
  ('100% Whey Concentrado 80% (Chocolate / Baunilha)', 'Growth Supplements', 'Suplementos & Fitness', 'g', 100.0, '30g (1 dosador)', 406.7, 80, 11.7, 6, 3.7, 1.3, 0.7, 0, 150, 0, 193.3, 'verified', 'FIT_1', false, 1),
  ('Whey Protein Isolado 90% (Natural)', 'Growth Supplements', 'Suplementos & Fitness', 'g', 100.0, '30g (1 dosador)', 360, 90, 0, 0, 0, 0, 0, 0, 16.7, 0, 150, 'verified', 'FIT_2', false, 1),
  ('100% Whey Protein Concentrado', 'Max Titanium', 'Suplementos & Fitness', 'g', 100.0, '30g (2 dosadores)', 400, 70, 16, 6.7, 4, 1.7, 0.7, 0, 166.7, 0, 216.7, 'verified', 'FIT_3', false, 1),
  ('Whey Protein Concentrado 100%', 'Dux Nutrition', 'Suplementos & Fitness', 'g', 100.0, '30g (1 dosador)', 393.3, 73.3, 12, 6.3, 3.7, 1.7, 0.7, 0, 140, 0, 200, 'verified', 'FIT_4', false, 1),
  ('Super Whey 100% Pure', 'IntegralMedica', 'Suplementos & Fitness', 'g', 100.0, '30g (1 dosador)', 403.3, 70, 15, 7, 4.3, 1.7, 0.7, 0, 160, 0, 233.3, 'verified', 'FIT_5', false, 1),
  ('Creatina Monohidratada 100% Pura Creapure', 'Growth / Max / Creapure', 'Suplementos & Fitness', 'g', 100.0, '3g (1 colher dosadora)', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'verified', 'FIT_6', false, 1),
  ('YoPRO Bebida Láctea UHT 15g Proteína', 'Danone YoPRO', 'Leite & Laticínios', 'ml', 100.0, '250ml (1 garrafinha)', 58.8, 6, 6, 1.2, 0.7, 0.3, 0.1, 0, 4.8, 0, 70, 'verified', 'FIT_7', false, 1),
  ('YoPRO Bebida Láctea UHT 25g Proteína', 'Danone YoPRO', 'Leite & Laticínios', 'ml', 100.0, '250ml (1 garrafinha)', 66, 10, 4.4, 0.9, 0.6, 0.2, 0, 0, 6, 0, 76, 'verified', 'FIT_8', false, 1),
  ('Bebida Láctea Piracanjuba Whey 23g Proteína', 'Piracanjuba', 'Leite & Laticínios', 'ml', 100.0, '250ml (1 garrafinha)', 67.2, 9.2, 5.6, 0.9, 0.5, 0.2, 0.1, 0, 5.6, 1, 84, 'verified', 'FIT_9', false, 1),
  ('Iogurte Natural Desnatado 0% Gordura', 'Nestlé / Batavo', 'Leite & Laticínios', 'g', 100.0, '160g (1 pote)', 41.9, 4.3, 6.1, 0, 0, 0, 0, 0, 1.3, 0, 59.4, 'verified', 'FIT_10', false, 1),
  ('Pasta de Amendoim Integral 100% Pura', 'Dr. Peanut / Naked Nuts / Growth', 'Oleaginosas & Sementes', 'g', 100.0, '20g (1 colher de sopa)', 595, 28.5, 11, 49.5, 9, 26, 14, 0, 0, 8, 0, 'verified', 'FIT_11', false, 1),
  ('Azeite de Oliva Extra Virgem', 'Gallo / Borges / Andorinha', 'Óleos & Gorduras', 'ml', 100.0, '13ml (1 colher de sopa)', 830.8, 0, 0, 92.3, 13.8, 67.7, 9.2, 0, 0, 0, 0, 'verified', 'FIT_12', false, 2),
  ('Barra de Proteína Darkness Dark Bar 90g', 'Darkness', 'Suplementos & Fitness', 'g', 100.0, '90g (1 barra inteira)', 386.7, 31.1, 34.4, 13.3, 7.6, 3.9, 1.6, 0, 16.7, 4.2, 177.8, 'verified', 'FIT_13', false, 1),
  ('Barra de Proteína Bold Bar 60g', 'Bold Snacks', 'Suplementos & Fitness', 'g', 100.0, '60g (1 barra)', 391.7, 33.3, 30, 14.2, 8, 4.3, 1.7, 0, 16.7, 8.3, 183.3, 'verified', 'FIT_14', false, 1),
  ('Whey Grego Bar 40g', 'Nutrata', 'Suplementos & Fitness', 'g', 100.0, '40g (1 barra)', 370, 27.5, 35, 14, 8.5, 4, 1.3, 0, 20, 5, 212.5, 'verified', 'FIT_15', false, 1),
  ('Frango Desfiado Cozido a Vapor', 'Vapza', 'Carnes & Aves', 'g', 100.0, '100g (1 porção)', 153, 30.5, 0, 3.2, 0.9, 1.2, 0.8, 0, 78, 0, 65, 'verified', 'FIT_16', false, 1),
  ('Clara de Ovo Pasteurizada Resfriada', 'Fleischmann / MaxxiOvos', 'Ovos & Derivados', 'g', 100.0, '100g (~3 claras)', 48, 11, 0, 0, 0, 0, 0, 0, 0, 0, 160, 'verified', 'FIT_17', false, 1),
  ('Pão de Forma 100% Integral Grão Sabor', 'Wickbold', 'Cereais & Pães', 'g', 100.0, '50g (2 fatias)', 236, 13.6, 36, 3.6, 0.8, 1, 1.6, 0, 0, 9.6, 390, 'verified', 'FIT_18', false, 1),
  ('Tapioca Hidratada Pronta', 'Da Terrinha / Akio', 'Cereais & Pães', 'g', 100.0, '50g (3 colheres de sopa)', 240, 0, 60, 0, 0, 0, 0, 0, 0, 1, 0, 'verified', 'FIT_19', false, 1)
ON CONFLICT DO NOTHING;

