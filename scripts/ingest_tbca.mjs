/**
 * ingest_tbca.mjs
 * Script de extração, sanitização e normalização da base oficial TBCA (USP).
 * 5.668 alimentos e preparações culinárias brasileiras.
 * 
 * Regras de sanitização clínica e engenharia de dados:
 * 1. "tr" / "Tr" (traços) -> 0.00
 * 2. "NA" / "" / "*" (não aplicável ou ausente) -> null
 * 3. Vírgulas decimais ("10,7") convertidas para ponto ("10.7")
 * 4. Normalização para porção de 100g/100ml
 * 5. Remoção de pontuações residuais nos nomes
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const TBCA_RAW_URL = 'https://raw.githubusercontent.com/raul-rznd/web-scraping-tbca/main/alimentos.txt';
const DATA_DIR = path.resolve('data');
const RAW_FILE = path.join(DATA_DIR, 'tbca_raw.jsonl');
const CLEAN_JSON_FILE = path.join(DATA_DIR, 'tbca_clean.json');
const SQL_SEED_FILE = path.join(DATA_DIR, 'tbca_seed.sql');

function parseNutrientValue(rawVal) {
  if (!rawVal) return null;
  const str = String(rawVal).trim().toLowerCase();
  if (str === 'tr') return 0.0;
  if (str === 'na' || str === '*' || str === '-' || str === '') return null;
  const num = parseFloat(str.replace(',', '.'));
  return isNaN(num) ? null : Math.round(num * 100) / 100;
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

  console.log('🔄 Processando e sanitizando os 5.668 registros...');
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
      let nome = (raw.descricao || '').trim();
      // Remove vírgulas finais no nome
      if (nome.endsWith(',')) nome = nome.slice(0, -1).trim();

      const nutrientesMap = {};
      for (const n of raw.nutrientes || []) {
        nutrientesMap[n.Componente] = n['Valor por 100g'];
      }

      // Extração de nutrientes chave
      const calories = parseNutrientValue(nutrientesMap['Energia']) || 0;
      const protein_g = parseNutrientValue(nutrientesMap['Proteína']) || 0;
      // Dá preferência a Carboidrato disponível; se não houver, usa Carboidrato total
      const carbs_g = parseNutrientValue(nutrientesMap['Carboidrato disponível']) ?? parseNutrientValue(nutrientesMap['Carboidrato total']) ?? 0;
      const fats_g = parseNutrientValue(nutrientesMap['Lipídios']) || 0;
      const fiber_g = parseNutrientValue(nutrientesMap['Fibra alimentar']);
      const sodium_mg = parseNutrientValue(nutrientesMap['Sódio']);

      cleanFoods.push({
        name: nome,
        brand: null,
        unit_type: 'g',
        base_qty: 100.0,
        serving_description: '100g (porção de referência)',
        calories: calories,
        protein_g: protein_g,
        carbs_g: carbs_g,
        fats_g: fats_g,
        fiber_g: fiber_g,
        sodium_mg: sodium_mg,
        source: 'tbca',
        source_id: codigo,
        is_incomplete: fiber_g === null,
      });
    } catch (e) {
      console.warn(`Aviso: falha na linha ${lineNumber}: ${e.message}`);
    }
  }

  console.log(`✓ Processamento concluído: ${cleanFoods.length} alimentos estruturados com sucesso.`);

  // Salva JSON sanitizado
  fs.writeFileSync(CLEAN_JSON_FILE, JSON.stringify(cleanFoods, null, 2), 'utf-8');
  console.log(`✓ JSON sanitizado salvo em: ${CLEAN_JSON_FILE}`);

  // Gera script SQL em batches de 200 inserts para rodar no Supabase
  console.log('💾 Gerando script SQL de seed...');
  let sql = `-- SEED TBCA (5.668 Alimentos Brasileiros e Preparações Culinárias)
-- Fonte: TBCA / USP (Tabela Brasileira de Composição de Alimentos)
`;

  const BATCH_SIZE = 100;
  for (let i = 0; i < cleanFoods.length; i += BATCH_SIZE) {
    const batch = cleanFoods.slice(i, i + BATCH_SIZE);
    sql += `INSERT INTO public.foods_master (name, brand, unit_type, base_qty, serving_description, calories, protein_g, carbs_g, fats_g, fiber_g, sodium_mg, source, source_id, is_incomplete)\nVALUES\n`;
    
    const values = batch.map((f) => {
      const escName = f.name.replace(/'/g, "''");
      const fiberVal = f.fiber_g === null ? 'NULL' : f.fiber_g;
      const sodiumVal = f.sodium_mg === null ? 'NULL' : f.sodium_mg;
      return `  ('${escName}', NULL, 'g', 100.0, '100g', ${f.calories}, ${f.protein_g}, ${f.carbs_g}, ${f.fats_g}, ${fiberVal}, ${sodiumVal}, 'tbca', '${f.source_id}', ${f.is_incomplete})`;
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
