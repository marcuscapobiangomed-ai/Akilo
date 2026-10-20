import assert from 'node:assert';

function normalizeToIsoDate(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }
  return null;
}

function formatIsoToBrazilian(isoStr) {
  if (!isoStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) {
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return isoStr;
}

console.log('🧪 Testando Normalização de Datas (DD/MM/AAAA <-> YYYY-MM-DD)...');

// 1. Datas brasileiras com dia > 12 (as que quebravam o Postgres)
assert.strictEqual(normalizeToIsoDate('15/08/1995'), '1995-08-15');
assert.strictEqual(normalizeToIsoDate('28/02/2000'), '2000-02-28');
assert.strictEqual(normalizeToIsoDate('31/12/1988'), '1988-12-31');

// 2. Datas já em ISO devem ser preservadas
assert.strictEqual(normalizeToIsoDate('1995-08-15'), '1995-08-15');

// 3. Conversão de volta para exibição
assert.strictEqual(formatIsoToBrazilian('1995-08-15'), '15/08/1995');
assert.strictEqual(formatIsoToBrazilian('2000-02-28'), '28/02/2000');

console.log('✅ Todos os testes de data passaram com sucesso!');
