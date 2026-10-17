/**
 * populate_supabase.mjs
 * Upload em lote (batch upsert) dos catálogos TACO (597 alimentos) e Fitness (19 alimentos)
 * diretamente no Supabase PostgreSQL usando a Service Role Key.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '../frontend/node_modules/@supabase/supabase-js/dist/index.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zakjubaoocmplpmywxkm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  console.log('🚀 Iniciando sincronização com Supabase...');

  // 1. Carregar Fitness
  const fitnessPath = path.resolve('data/fitness_clean.json');
  const tacoPath = path.resolve('data/taco_clean.json');

  if (fs.existsSync(fitnessPath)) {
    const fitnessItems = JSON.parse(fs.readFileSync(fitnessPath, 'utf8'));
    console.log(`📦 Enviando ${fitnessItems.length} itens do catálogo Fitness...`);
    
    // Limpeza idempotente da fonte verified
    await supabase.from('foods_master').delete().eq('source', 'verified');

    const { error: fitErr } = await supabase.from('foods_master').insert(fitnessItems);
    if (fitErr) {
      console.error('❌ Erro no catálogo Fitness:', fitErr.message);
    } else {
      console.log('✅ Catálogo Fitness sincronizado com sucesso!');
    }
  }

  // 2. Carregar TACO em lotes de 100
  if (fs.existsSync(tacoPath)) {
    const tacoItems = JSON.parse(fs.readFileSync(tacoPath, 'utf8'));
    console.log(`📦 Enviando ${tacoItems.length} alimentos da TACO (Unicamp) em lotes...`);
    
    // Limpeza idempotente da fonte taco
    await supabase.from('foods_master').delete().eq('source', 'taco');

    const BATCH_SIZE = 100;
    let successCount = 0;
    let hasError = false;

    for (let i = 0; i < tacoItems.length; i += BATCH_SIZE) {
      const batch = tacoItems.slice(i, i + BATCH_SIZE);
      const end = Math.min(i + BATCH_SIZE, tacoItems.length);
      console.log(`⏳ Enviando lote [${i + 1} - ${end}] de ${tacoItems.length}...`);
      const { error: tacoErr } = await supabase.from('foods_master').insert(batch);
      if (tacoErr) {
        console.error(`❌ Erro no lote [${i + 1} - ${end}]:`, tacoErr.message);
        hasError = true;
      } else {
        successCount += batch.length;
        console.log(`✅ Lote [${i + 1} - ${end}] gravado com sucesso! (${successCount}/${tacoItems.length})`);
      }
    }
    if (!hasError) {
      console.log('🎉 Todos os 597 alimentos da TACO foram sincronizados com sucesso!');
    }
  }
}

run().catch(console.error);
