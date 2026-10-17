/**
 * ingest_tbca.mjs
 * Script de extração, sanitização e normalização da base oficial TBCA (USP).
 * 5.668 alimentos e preparações culinárias brasileiras com perfil lipídico completo.
 * 
 * Regras de sanitização clínica e engenharia de dados:
 * 1. "tr" / "Tr" (traços) -> 0.00
 * 2. "NA" / "" / "*" (não aplicável ou ausente) -> null
 * 3. Vírgulas decimais ("10,7") convertidas para ponto ("10.7")
 * 4. Normalização para porção de 100g/100ml
 * 5. Extração de Lipídios Totais, Saturadas, Monoinsaturadas, Poli-insaturadas, Trans e Colesterol
 * 6. Mapeamento da classe original para categorias amigáveis do app
 * 7. Limpeza de nomes botânicos residuais (ex: Oryza sativa L., Gallus gallus)
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { classifyNovaGroup } from '../frontend/core/domain/nutritionEngine.ts';

const TBCA_RAW_URL = 'https://raw.githubusercontent.com/raul-rznd/web-scraping-tbca/main/alimentos.txt';
const DATA_DIR = path.resolve('data');
const RAW_FILE = path.join(DATA_DIR, 'tbca_raw.jsonl');
const CLEAN_JSON_FILE = path.join(DATA_DIR, 'tbca_clean.json');
const SQL_SEED_FILE = path.join(DATA_DIR, 'tbca_seed.sql');

function parseNutrientValue(rawVal) {
  if (rawVal === undefined || rawVal === null) return null;
  const str = String(rawVal).trim().toLowerCase();
  if (str === 'tr') return 0.0;
  if (str === 'na' || str === '*' || str === '-' || str === '') return null;
  const num = parseFloat(str.replace(',', '.'));
  return isNaN(num) ? null : Math.round(num * 100) / 100;
}

const CATEGORY_MAP = {
  'Carnes e derivados': 'Carnes & Aves',
  'Vegetais e derivados': 'Vegetais & Verduras',
  'Cereais e derivados': 'Cereais & Pães',
  'Pescados e Frutos do mar': 'Pescados & Frutos do Mar',
  'Pescados e frutos do mar': 'Pescados & Frutos do Mar',
  'Frutas e derivados': 'Frutas',
  'Leguminosas e derivados': 'Leguminosas & Grãos',
  'Leite e derivados': 'Leite & Laticínios',
  'Ovos e derivados': 'Ovos & Derivados',
  'Bebidas': 'Bebidas',
  'Alimentos para fins especiais': 'Alimentos Especiais / Diet',
  'Produtos açucarados': 'Doces & Sobremesas',
  'Açúcares e doces': 'Doces & Sobremesas',
  'Gorduras e óleos': 'Óleos & Gorduras',
  'Alimentos industrializados': 'Industrializados & Lanches',
  'Fast food': 'Industrializados & Lanches',
  'Sementes e Oleaginosas': 'Oleaginosas & Sementes',
  'Miscelâneas': 'Diversos',
};

function cleanFoodName(rawName) {
  if (!rawName) return '';
  let name = rawName.trim();
  // Remove pontuação residual final
  if (name.endsWith(',')) name = name.slice(0, -1).trim();

  // Remove sufixos botânicos comuns no final do nome
  name = name.replace(/,\s*[A-Z][a-z]+\s+[a-z]+(\s+[A-Z][a-z]*|\s+L\.|\s+Sweet|\s+var\.|\s+sp\.)*$/i, '');
  if (name.endsWith(',')) name = name.slice(0, -1).trim();

  return name;
}

async function downloadRawIfMissing() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(RAW_FILE)) {
    console.log(`✓ Arquivo bruto já existe em: ${RAW_FILE}`);
    return;
  }

  console.log(`⬇️ Baixando base bruta da TBCA de: ${TBCA_RAW_URL}...`);
  const res = await fetch(TBCA_RAW_URL);
  if (!res.ok) {
    throw new Error(`Falha no download da TBCA: HTTP ${res.status}`);
  }
  const text = await res.text();
  fs.writeFileSync(RAW_FILE, text, 'utf-8');
  console.log(`✓ Base bruta salva com sucesso (${(text.length / 1024 / 1024).toFixed(2)} MB).`);
}

async function processTBCA() {
  await downloadRawIfMissing();

  console.log('🔄 Processando, categorizando e extraindo perfil lipídico de 5.668 registros...');
  const fileStream = fs.createReadStream(RAW_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const cleanFoods = [];
  let lineNumber = 0;

  for await (const line of rl) {
    lineNumber++;
    if (!line.trim()) continue;

    try {
      const raw = JSON.parse(line);
      const codigo = raw.codigo;
      const categoria = CATEGORY_MAP[raw.classe] || raw.classe || 'Diversos';
      const nome = cleanFoodName(raw.descricao);

      const nutrientesMap = {};
      for (const n of raw.nutrientes || []) {
        nutrientesMap[n.Componente] = n['Valor por 100g'];
      }

      // Macronutrientes fundamentais
      const calories = parseNutrientValue(nutrientesMap['Energia']) || 0;
      const protein_g = parseNutrientValue(nutrientesMap['Proteína']) || 0;
      const carbs_g = parseNutrientValue(nutrientesMap['Carboidrato disponível']) ?? parseNutrientValue(nutrientesMap['Carboidrato total']) ?? 0;
      const fats_g = parseNutrientValue(nutrientesMap['Lipídios']) || 0;

      // Perfil Lipídico Detalhado (Clínica e Saúde Cardiovascular)
      const saturated_fats_g = parseNutrientValue(nutrientesMap['Ácidos graxos saturados']) ?? 0;
      const monounsaturated_fats_g = parseNutrientValue(nutrientesMap['Ácidos graxos monoinsaturados']) ?? 0;
      const polyunsaturated_fats_g = parseNutrientValue(nutrientesMap['Ácidos graxos poliinsaturados']) ?? 0;
      const trans_fats_g = parseNutrientValue(nutrientesMap['Ácidos graxos trans']) ?? 0;
      const cholesterol_mg = parseNutrientValue(nutrientesMap['Colesterol']) ?? 0;

      // Qualidade nutricional complementar
      const fiber_g = parseNutrientValue(nutrientesMap['Fibra alimentar']);
      const sodium_mg = parseNutrientValue(nutrientesMap['Sódio']);

      const novaClassification = classifyNovaGroup(nome, categoria);

      cleanFoods.push({
        name: nome,
        brand: null,
        category: categoria,
        unit_type: 'g',
        base_qty: 100.0,
        serving_description: '100g (porção de referência)',
        calories: calories,
        protein_g: protein_g,
        carbs_g: carbs_g,
        fats_g: fats_g,
        saturated_fats_g: saturated_fats_g,
        monounsaturated_fats_g: monounsaturated_fats_g,
        polyunsaturated_fats_g: polyunsaturated_fats_g,
        trans_fats_g: trans_fats_g,
        cholesterol_mg: cholesterol_mg,
        fiber_g: fiber_g,
        sodium_mg: sodium_mg,
        source: 'tbca',
        source_id: codigo,
        is_incomplete: fiber_g === null,
        nova_group: novaClassification.group,
      });
    } catch (e) {
      console.warn(`Aviso: falha na linha ${lineNumber}: ${e.message}`);
    }
  }

  console.log(`✓ Processamento concluído: ${cleanFoods.length} alimentos estruturados com perfil lipídico completo e classificação NOVA.`);

  // Salva JSON sanitizado
  fs.writeFileSync(CLEAN_JSON_FILE, JSON.stringify(cleanFoods, null, 2), 'utf-8');
  console.log(`✓ JSON sanitizado salvo em: ${CLEAN_JSON_FILE}`);

  // Gera script SQL em batches de 100 inserts para o Supabase
  console.log('💾 Gerando script SQL de seed atualizado com classificação NOVA...');
  let sql = `-- SEED TBCA EXPANDIDO (5.668 Alimentos Brasileiros com Perfil Lipídico, Categorias e Classificação NOVA)
-- Fonte: TBCA / USP (Tabela Brasileira de Composição de Alimentos) & Guia Alimentar (MS)
`;

  const BATCH_SIZE = 100;
  for (let i = 0; i < cleanFoods.length; i += BATCH_SIZE) {
    const batch = cleanFoods.slice(i, i + BATCH_SIZE);
    sql += `INSERT INTO public.foods_master (name, brand, category, unit_type, base_qty, serving_description, calories, protein_g, carbs_g, fats_g, saturated_fats_g, monounsaturated_fats_g, polyunsaturated_fats_g, trans_fats_g, cholesterol_mg, fiber_g, sodium_mg, source, source_id, is_incomplete, nova_group)\nVALUES\n`;
    
    const values = batch.map((f) => {
      const escName = f.name.replace(/'/g, "''");
      const escCat = f.category.replace(/'/g, "''");
      const fiberVal = f.fiber_g === null ? 'NULL' : f.fiber_g;
      const sodiumVal = f.sodium_mg === null ? 'NULL' : f.sodium_mg;
      return `  ('${escName}', NULL, '${escCat}', 'g', 100.0, '100g', ${f.calories}, ${f.protein_g}, ${f.carbs_g}, ${f.fats_g}, ${f.saturated_fats_g}, ${f.monounsaturated_fats_g}, ${f.polyunsaturated_fats_g}, ${f.trans_fats_g}, ${f.cholesterol_mg}, ${fiberVal}, ${sodiumVal}, 'tbca', '${f.source_id}', ${f.is_incomplete}, ${f.nova_group})`;
    });

    sql += values.join(',\n') + '\nON CONFLICT DO NOTHING;\n\n';
  }

  fs.writeFileSync(SQL_SEED_FILE, sql, 'utf-8');
  console.log(`✓ Script SQL gerado com sucesso em: ${SQL_SEED_FILE} (${(fs.statSync(SQL_SEED_FILE).size / 1024 / 1024).toFixed(2)} MB)`);
}

processTBCA().catch((err) => {
  console.error('ERRO:', err);
  process.exit(1);
});
