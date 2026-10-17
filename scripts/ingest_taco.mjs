/**
 * ingest_taco.mjs
 * Script de ingestão da Tabela TACO (UNICAMP - 4ª Edição).
 * 597 alimentos puros fundamentais da dieta brasileira com perfil lipídico completo.
 * 
 * Fonte: NEPA / UNICAMP - Tabela Brasileira de Composição de Alimentos
 */

import fs from 'node:fs';
import path from 'node:path';
import { classifyNovaGroup } from '../frontend/core/domain/nutritionEngine.ts';

const TACO_RAW_URL = 'https://raw.githubusercontent.com/marcelosanto/tabela_taco/master/tabela_alimentos.json';
const DATA_DIR = path.resolve('data');
const TACO_CLEAN_JSON = path.join(DATA_DIR, 'taco_clean.json');
const TACO_SEED_SQL = path.join(DATA_DIR, 'taco_seed.sql');

function parseNum(val) {
  if (val === undefined || val === null) return 0;
  const str = String(val).trim().toLowerCase();
  if (str === 'tr' || str === 'traços') return 0.0;
  if (str === 'na' || str === '*' || str === '-' || str === '') return 0.0;
  const num = parseFloat(str.replace(',', '.'));
  return isNaN(num) || num < 0 ? 0.0 : Math.round(num * 100) / 100;
}

const CATEGORY_MAP = {
  'Cereais e derivados': 'Cereais & Pães',
  'Verduras, hortaliças e derivados': 'Vegetais & Verduras',
  'Frutas e derivados': 'Frutas',
  'Gorduras e óleos': 'Óleos & Gorduras',
  'Pescados e frutos do mar': 'Pescados & Frutos do Mar',
  'Carnes e derivados': 'Carnes & Aves',
  'Leite e derivados': 'Leite & Laticínios',
  'Bebidas (alcoólicas e não alcoólicas)': 'Bebidas',
  'Ovos e derivados': 'Ovos & Derivados',
  'Produtos açucarados': 'Doces & Sobremesas',
  'Miscelâneas': 'Diversos',
  'Outros alimentos industrializados': 'Industrializados & Lanches',
  'Alimentos preparados': 'Pratos Preparados',
  'Leguminosas e derivados': 'Leguminosas & Grãos',
  'Nozes e sementes': 'Oleaginosas & Sementes',
};

async function processTACO() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log(`⬇️ Baixando base oficial TACO de: ${TACO_RAW_URL}...`);
  const res = await fetch(TACO_RAW_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar TACO`);
  const rawList = await res.json();
  console.log(`✓ Baixados ${rawList.length} alimentos da TACO (UNICAMP).`);

  const cleanFoods = [];

  for (const item of rawList) {
    const nome = String(item.description || '').trim();
    if (!nome) continue;

    const cat = CATEGORY_MAP[item.category] || item.category || 'Diversos';
    const cals = parseNum(item.energy_kcal);
    const prot = parseNum(item.protein_g);
    const carbs = parseNum(item.carbohydrate_g);
    const fats = parseNum(item.lipid_g);
    const fiber = parseNum(item.fiber_g);
    const sodium = parseNum(item.sodium_mg);

    // Perfil Lipídico
    const sat = parseNum(item.saturated_g);
    const mono = parseNum(item.monounsaturated_g);
    const poly = parseNum(item.polyunsaturated_g);
    const trans = parseNum(item['18:1t_g']) + parseNum(item['18:2t_g']);
    const chol = parseNum(item.cholesterol_mg);

    const novaClassification = classifyNovaGroup(nome, cat);

    cleanFoods.push({
      name: nome,
      brand: null,
      category: cat,
      unit_type: 'g',
      base_qty: 100.0,
      serving_description: '100g (porção de referência)',
      calories: cals,
      protein_g: prot,
      carbs_g: carbs,
      fats_g: fats,
      saturated_fats_g: sat,
      monounsaturated_fats_g: mono,
      polyunsaturated_fats_g: poly,
      trans_fats_g: Math.round(trans * 100) / 100,
      cholesterol_mg: chol,
      fiber_g: fiber,
      sodium_mg: sodium,
      source: 'taco',
      source_id: `TACO_${item.id}`,
      is_incomplete: false,
      nova_group: novaClassification.group,
    });
  }

  // Salva JSON
  fs.writeFileSync(TACO_CLEAN_JSON, JSON.stringify(cleanFoods, null, 2), 'utf-8');
  console.log(`✓ JSON TACO sanitizado salvo em: ${TACO_CLEAN_JSON}`);

  // Gera SQL de Seed
  console.log('💾 Gerando script SQL de seed para a TACO com classificação NOVA...');
  let sql = `-- SEED TACO (597 Alimentos Puros Brasileiros - UNICAMP 4ª Edição & Classificação NOVA)
-- Fonte: Núcleo de Estudos e Pesquisas em Alimentação (NEPA / UNICAMP) & Guia Alimentar (MS)
`;

  const BATCH_SIZE = 100;
  for (let i = 0; i < cleanFoods.length; i += BATCH_SIZE) {
    const batch = cleanFoods.slice(i, i + BATCH_SIZE);
    sql += `INSERT INTO public.foods_master (name, brand, category, unit_type, base_qty, serving_description, calories, protein_g, carbs_g, fats_g, saturated_fats_g, monounsaturated_fats_g, polyunsaturated_fats_g, trans_fats_g, cholesterol_mg, fiber_g, sodium_mg, source, source_id, is_incomplete, nova_group)\nVALUES\n`;

    const values = batch.map((f) => {
      const escName = f.name.replace(/'/g, "''");
      const escCat = f.category.replace(/'/g, "''");
      return `  ('${escName}', NULL, '${escCat}', 'g', 100.0, '100g', ${f.calories}, ${f.protein_g}, ${f.carbs_g}, ${f.fats_g}, ${f.saturated_fats_g}, ${f.monounsaturated_fats_g}, ${f.polyunsaturated_fats_g}, ${f.trans_fats_g}, ${f.cholesterol_mg}, ${f.fiber_g}, ${f.sodium_mg}, 'taco', '${f.source_id}', false, ${f.nova_group})`;
    });

    sql += values.join(',\n') + '\nON CONFLICT DO NOTHING;\n\n';
  }

  fs.writeFileSync(TACO_SEED_SQL, sql, 'utf-8');
  console.log(`✓ Script SQL TACO salvo em: ${TACO_SEED_SQL} (${(fs.statSync(TACO_SEED_SQL).size / 1024).toFixed(1)} KB)`);
}

processTACO().catch((err) => {
  console.error('ERRO TACO:', err);
  process.exit(1);
});
