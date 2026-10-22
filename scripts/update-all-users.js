const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente de backend/.env
const envPath = path.resolve(__dirname, '../backend/.env');
const env = fs.readFileSync(envPath, 'utf8');
const urlMatch = env.match(/SUPABASE_URL=([^\r\n]+)/);
const keyMatch = env.match(/SUPABASE_KEY=([^\r\n]+)/);

if (!urlMatch || !keyMatch) {
  console.error('Falha ao encontrar SUPABASE_URL ou SUPABASE_KEY em backend/.env');
  process.exit(1);
}

const SUPABASE_URL = urlMatch[1].trim();
const SUPABASE_KEY = keyMatch[1].trim();

const DEFAULT_TITA_CUSTOMIZATION = {
  eyeColor: '#38bdf8',      // Azul safira brilhante
  glovesColor: '#ef4444',
  suitColor: '#18181b',     // Bermuda de academia preto carbono
  topColor: '#18181b',
  sneakersColor: '#18181b', // Tênis esportivo preto
  hairColor: '#2b1d0c',     // Cabelo castanho escuro
  headbandColor: '#ef4444',
  skinTone: '#fde68a',      // Pele clara amigável
};

const DEFAULT_GAIA_CUSTOMIZATION = {
  eyeColor: '#10b981',      // Verde esmeralda radiante
  glovesColor: '#be123c',
  suitColor: '#18181b',     // Leg short biker preto carbono
  topColor: '#10b981',      // Top atlético verde esmeralda radiante
  sneakersColor: '#18181b', // Tênis esportivo de treino
  hairColor: '#452615',     // Cabelo castanho-caramelo sedoso
  headbandColor: '#facc15',
  skinTone: '#fde68a',      // Pele radiante
};

const userUpdates = [
  {
    id: 'f68099a4-145b-4ad6-8c3e-9ae4d7eea254',
    name: 'Marcus Capobiango',
    sex: 'male',
    avatar_mascot_id: 'tita',
    weight_kg: 95.0,
    height_cm: 178,
    age: 25,
    body_fat_pct: 30.0,
    muscle_mass_pct: 36.7,
    body_water_pct: 50.0,
    waist_cm: 108.0,
    initial_weight_kg: 95.0,
    initial_body_fat_pct: 30.0,
    initial_muscle_mass_pct: 36.7,
    initial_waist_cm: 108.0,
    initial_checkin_date: '2026-10-21',
    avatar_customization: DEFAULT_TITA_CUSTOMIZATION
  },
  {
    id: '7889a8fe-1fa7-4b4a-9d16-79b293002f69',
    name: 'Isabela Morais',
    sex: 'female',
    avatar_mascot_id: 'gaia',
    weight_kg: 70.0,
    height_cm: 170,
    age: 25,
    body_fat_pct: 27.5,
    muscle_mass_pct: 29.8,
    body_water_pct: 52.0,
    waist_cm: 75.0,
    initial_weight_kg: 70.0,
    initial_body_fat_pct: 27.5,
    initial_muscle_mass_pct: 29.8,
    initial_waist_cm: 75.0,
    initial_checkin_date: '2026-10-21',
    avatar_customization: DEFAULT_GAIA_CUSTOMIZATION
  },
  {
    id: 'efde667e-55dc-46da-9b98-a32145c9c4eb',
    name: 'Ana Isabella Lima Martins',
    sex: 'female',
    avatar_mascot_id: 'gaia',
    weight_kg: 72.0,
    height_cm: 170,
    age: 28,
    body_fat_pct: 32.5,
    muscle_mass_pct: 29.6, // Fisiologicamente corrigido de 65 (FFM) para SMM
    body_water_pct: 50.0,
    waist_cm: 76.0,
    initial_weight_kg: 72.0,
    initial_body_fat_pct: 32.5,
    initial_muscle_mass_pct: 29.6,
    initial_waist_cm: 76.0,
    avatar_customization: DEFAULT_GAIA_CUSTOMIZATION
  },
  {
    id: '76ca9f5d-ac52-45b4-95e8-0bde03271de1',
    name: 'Laura Oppelt',
    sex: 'female',
    avatar_mascot_id: 'gaia',
    weight_kg: 70.0,
    height_cm: 170,
    age: 25,
    body_fat_pct: 37.0,
    muscle_mass_pct: 31.9,
    body_water_pct: 46.0,
    waist_cm: 75.0,
    initial_weight_kg: 70.0,
    initial_body_fat_pct: 37.0,
    initial_muscle_mass_pct: 31.9,
    initial_waist_cm: 75.0,
    avatar_customization: DEFAULT_GAIA_CUSTOMIZATION
  },
  {
    id: 'ebcd3339-78f4-4288-a375-705bd826fc3f',
    name: 'Atleta Teste Retenção',
    sex: 'male',
    avatar_mascot_id: 'tita',
    weight_kg: 84.5,
    height_cm: 175,
    age: 29,
    body_fat_pct: 24.5,
    muscle_mass_pct: 33.0,
    body_water_pct: 53.0,
    waist_cm: 89.0,
    initial_weight_kg: 84.5,
    initial_body_fat_pct: 28.5,
    initial_muscle_mass_pct: 32.0,
    initial_waist_cm: 89.0,
    avatar_customization: DEFAULT_TITA_CUSTOMIZATION
  },
  {
    id: '8628330f-3b21-47d6-a310-206dc1cc61ac',
    name: 'Atleta Retenção V2',
    sex: 'male',
    avatar_mascot_id: 'tita',
    weight_kg: 86.4,
    height_cm: 178,
    age: 28,
    body_fat_pct: 26.8,
    muscle_mass_pct: 32.5,
    body_water_pct: 54.0,
    waist_cm: 91.0,
    initial_weight_kg: 86.4,
    initial_body_fat_pct: 26.8,
    initial_muscle_mass_pct: 32.5,
    initial_waist_cm: 91.0,
    avatar_customization: DEFAULT_TITA_CUSTOMIZATION
  },
  {
    id: '69051479-f917-4d9e-a694-8e989e3c3805',
    name: 'Marcus',
    sex: 'male',
    avatar_mascot_id: 'tita',
    weight_kg: 95.0,
    height_cm: 178,
    age: 25,
    body_fat_pct: 30.0,
    muscle_mass_pct: 36.7,
    body_water_pct: 50.0,
    waist_cm: 110.0,
    initial_weight_kg: 95.0,
    initial_body_fat_pct: 30.0,
    initial_muscle_mass_pct: 36.7,
    initial_waist_cm: 110.0,
    avatar_customization: DEFAULT_TITA_CUSTOMIZATION
  }
];

async function updateAll() {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  console.log('🚀 Iniciando calibração e atualização direta de todos os usuários...');
  for (const u of userUpdates) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${u.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(u)
    });
    if (!res.ok) {
      console.error(`Erro ao atualizar perfil ${u.name}:`, await res.text());
    } else {
      console.log(`✓ Perfil atualizado: ${u.name.padEnd(26)} -> Mascote: ${u.avatar_mascot_id.toUpperCase()} (${u.sex}) | Peso: ${u.weight_kg}kg | BF: ${u.body_fat_pct}% | Músculo: ${u.muscle_mass_pct}% | Cintura: ${u.waist_cm}cm`);
    }

    // Sincronizar auth user_metadata
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          user_metadata: {
            name: u.name,
            sex: u.sex,
            avatar_mascot_id: u.avatar_mascot_id,
          }
        })
      });
    } catch (e) {
      console.warn('Aviso auth user metadata:', e);
    }
  }

  // Corrigir check-in de Ana Isabella (65 -> 29.6)
  const cPatch = await fetch(`${SUPABASE_URL}/rest/v1/body_checkins?user_id=eq.efde667e-55dc-46da-9b98-a32145c9c4eb`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ muscle_mass_pct: 29.6 })
  });
  console.log('✓ Check-in histórico de Ana Isabella corrigido para 29.6% de massa muscular:', cPatch.ok);

  // Inserir check-in de Marco Zero para Marcus Capobiango se não existir
  await fetch(`${SUPABASE_URL}/rest/v1/body_checkins`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({
      user_id: 'f68099a4-145b-4ad6-8c3e-9ae4d7eea254',
      date: '2026-10-21',
      weight_kg: 95.0,
      body_fat_pct: 30.0,
      muscle_mass_pct: 36.7,
      body_water_pct: 50.0,
      waist_cm: 108.0,
      notes: 'Marco Zero calibrado'
    })
  });

  // Inserir check-in de Marco Zero para Isabela Morais se não existir
  await fetch(`${SUPABASE_URL}/rest/v1/body_checkins`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({
      user_id: '7889a8fe-1fa7-4b4a-9d16-79b293002f69',
      date: '2026-10-21',
      weight_kg: 70.0,
      body_fat_pct: 27.5,
      muscle_mass_pct: 29.8,
      body_water_pct: 52.0,
      waist_cm: 75.0,
      notes: 'Marco Zero calibrado'
    })
  });

  console.log('\n=================== AUDITORIA FINAL NO BANCO DE DADOS ===================');
  const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, { headers });
  const checkProfiles = await checkRes.json();
  for (const p of checkProfiles) {
    console.log(`[${p.avatar_mascot_id.toUpperCase()}] ${p.name.padEnd(26)} | Sexo: ${p.sex.padEnd(6)} | Peso: ${p.weight_kg}kg | BF: ${p.body_fat_pct}% | Músculo: ${p.muscle_mass_pct}% | Cintura: ${p.waist_cm}cm | Custom: ${p.avatar_customization ? '✓ Configurado' : '❌'}`);
  }
  console.log('========================================================================\n');
}

updateAll();
