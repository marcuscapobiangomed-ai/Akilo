/**
 * auth-validation-test.mjs
 * Bateria de testes automatizados do fluxo de criação, validação de conta e resiliência de perfil.
 */

import assert from 'node:assert';

console.log('🧪 Iniciando Bateria de Testes do Fluxo de Cadastro e Validação...\n');

let passedTests = 0;
let totalTests = 0;

function it(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(`     Erro: ${err.message}`);
  }
}

// ============================================================================
// 1. FORMATAÇÃO E MAPEAMENTO DE ERROS DE CADASTRO
// ============================================================================
console.log('--- 1. Mapeamento de Erros e Mensagens Amigáveis ---');

const formatSignupError = (errMessage) => {
  if (!errMessage) return 'Falha ao realizar cadastro. Tente novamente.';
  const msg = errMessage.toLowerCase();
  if (msg.includes('user already registered') || msg.includes('already exists')) {
    return 'Já existe uma conta cadastrada com este e-mail.';
  }
  if (msg.includes('password should be at least')) {
    return 'A senha deve ter no mínimo 6 caracteres.';
  }
  if (msg.includes('invalid email') || msg.includes('unable to validate email')) {
    return 'Informe um formato de e-mail válido.';
  }
  if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit') || msg.includes('too many requests')) {
    return 'Limite de envio de e-mails atingido temporariamente no servidor (máximo de cadastros/hora). Aguarde alguns instantes.';
  }
  return errMessage;
};

it('Deve mapear erro 429 over_email_send_rate_limit para aviso amigável em português', () => {
  const result = formatSignupError('email rate limit exceeded');
  assert.ok(result.includes('Limite de envio de e-mails atingido temporariamente'));
});

it('Deve mapear erro over_email_send_rate_limit do Supabase', () => {
  const result = formatSignupError('AuthApiError: over_email_send_rate_limit');
  assert.ok(result.includes('Limite de envio de e-mails atingido temporariamente'));
});

it('Deve mapear usuário já existente', () => {
  const result = formatSignupError('User already registered');
  assert.strictEqual(result, 'Já existe uma conta cadastrada com este e-mail.');
});

it('Deve mapear senha curta', () => {
  const result = formatSignupError('Password should be at least 6 characters');
  assert.strictEqual(result, 'A senha deve ter no mínimo 6 caracteres.');
});

it('Deve mapear e-mail inválido', () => {
  const result = formatSignupError('Unable to validate email address: invalid format');
  assert.strictEqual(result, 'Informe um formato de e-mail válido.');
});

// ============================================================================
// 2. VALIDAÇÃO DE ENTRADAS DO FORMULÁRIO DE CADASTRO
// ============================================================================
console.log('\n--- 2. Validação de Entradas no Cadastro ---');

const validateSignupInputs = (name, email, password) => {
  const trimmedName = (name || '').trim();
  const trimmedEmail = (email || '').trim().toLowerCase();

  if (!trimmedName || !trimmedEmail || !password) {
    return { valid: false, error: 'Por favor, preencha todos os campos.' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'A senha deve conter no mínimo 6 caracteres.' };
  }
  if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
    return { valid: false, error: 'Informe um formato de e-mail válido.' };
  }
  return { valid: true, name: trimmedName, email: trimmedEmail, password };
};

it('Deve rejeitar campos vazios', () => {
  const res = validateSignupInputs('', 'user@test.com', '123456');
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, 'Por favor, preencha todos os campos.');
});

it('Deve rejeitar senha com menos de 6 caracteres', () => {
  const res = validateSignupInputs('Ana', 'ana@test.com', '12345');
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, 'A senha deve conter no mínimo 6 caracteres.');
});

it('Deve normalizar e-mail com espaços e letras maiúsculas', () => {
  const res = validateSignupInputs('  Carlos Silva  ', '  Carlos.Silva@EXEMPLO.COM  ', 'senhaForte123');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.name, 'Carlos Silva');
  assert.strictEqual(res.email, 'carlos.silva@exemplo.com');
});

// ============================================================================
// 3. VALIDAÇÃO DE TOKEN OTP (IN-APP)
// ============================================================================
console.log('\n--- 3. Validação de Código Numérico OTP ---');

const validateOtpToken = (token) => {
  const clean = (token || '').trim();
  if (!clean) return { valid: false, error: 'Código vazio' };
  // Aceita códigos de 6 a 12 dígitos
  if (!/^\d{6,12}$/.test(clean)) {
    return { valid: false, error: 'Código deve conter apenas dígitos numéricos' };
  }
  return { valid: true, token: clean };
};

it('Deve aceitar código numérico de 8 dígitos gerado pelo Supabase', () => {
  const res = validateOtpToken('  56236975  ');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.token, '56236975');
});

it('Deve aceitar código numérico de 6 dígitos', () => {
  const res = validateOtpToken('123456');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.token, '123456');
});

it('Deve rejeitar código com letras ou caracteres especiais', () => {
  const res = validateOtpToken('5623-69a');
  assert.strictEqual(res.valid, false);
});

// ============================================================================
// 4. FALLBACK CIRÚRGICO DE COLUNAS EM API.TS (PRESERVAÇÃO DE BIOIMPEDÂNCIA)
// ============================================================================
console.log('\n--- 4. Fallback Cirúrgico de Colunas no Perfil ---');

const simulateProfileUpdateFallback = (payload, dbErrorMessage) => {
  let updatedPayload = { ...payload };
  const candidateColumns = [
    'birth_date',
    'avatar_customization',
    'initial_muscle_mass_pct',
    'initial_checkin_date',
    'initial_waist_cm',
    'initial_body_fat_pct',
    'initial_weight_kg',
    'avatar_mascot_id',
    'waist_cm',
    'body_water_pct',
    'basal_metabolism_kcal',
    'metabolic_age',
    'muscle_mass_pct',
    'body_fat_pct',
    'sex',
  ];

  const msg = dbErrorMessage.toLowerCase();
  let changed = false;

  for (const col of candidateColumns) {
    if (msg.includes(col) && col in updatedPayload) {
      delete updatedPayload[col];
      changed = true;
    }
  }

  return { updatedPayload, changed };
};

it('Se birth_date for rejeitada pelo schema cache, remove APENAS birth_date e preserva todas as outras métricas', () => {
  const fullPayload = {
    name: 'Isabela Morais',
    sex: 'female',
    avatar_mascot_id: 'gaia',
    birth_date: '15/04/1998',
    height_cm: 165,
    weight_kg: 58.5,
    waist_cm: 68.0,
    body_fat_pct: 22.4,
    muscle_mass_pct: 35.1,
    initial_weight_kg: 58.5,
    initial_body_fat_pct: 22.4,
  };

  const dbError = "Could not find the 'birth_date' column of 'profiles' in the schema cache";
  const { updatedPayload, changed } = simulateProfileUpdateFallback(fullPayload, dbError);

  assert.strictEqual(changed, true);
  assert.strictEqual(updatedPayload.birth_date, undefined, 'birth_date deve ser removida');
  assert.strictEqual(updatedPayload.sex, 'female', 'sex DEVE ser preservado!');
  assert.strictEqual(updatedPayload.avatar_mascot_id, 'gaia', 'avatar_mascot_id DEVE ser preservado!');
  assert.strictEqual(updatedPayload.waist_cm, 68.0, 'waist_cm DEVE ser preservado!');
  assert.strictEqual(updatedPayload.body_fat_pct, 22.4, 'body_fat_pct DEVE ser preservado!');
  assert.strictEqual(updatedPayload.muscle_mass_pct, 35.1, 'muscle_mass_pct DEVE ser preservado!');
  assert.strictEqual(updatedPayload.initial_weight_kg, 58.5, 'initial_weight_kg DEVE ser preservado!');
});

// ============================================================================
// RESULTADO FINAL
// ============================================================================
console.log(`\n📊 Relatório Final: ${passedTests}/${totalTests} testes aprovados.`);
if (passedTests === totalTests) {
  console.log('🎉 Todos os testes de validação passaram com 100% de sucesso!');
} else {
  process.exit(1);
}
