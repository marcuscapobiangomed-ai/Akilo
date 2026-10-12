import assert from 'node:assert/strict';
import { calculatePortion, evaluateFiberDensity } from './nutritionEngine.ts';
import { analyzeWeightTrend, explainDailyFluctuation } from './trendsEngine.ts';
import { generateSmartInsights } from './insightsEngine.ts';
import { calculateWeeklyHabitScore } from './scoringEngine.ts';

console.log('🧪 Iniciando testes unitários dos Motores de Domínio...');

// 1. Teste de Porções e Macronutrientes
const baseFood = {
  base_qty: 100,
  calories: 130,
  protein_g: 2.5,
  carbs_g: 28,
  fats_g: 0.5,
  fiber_g: 1.5,
  sodium_mg: 2.0,
};

const result150g = calculatePortion(baseFood, 150, 'g');
assert.equal(result150g.calories, 195, 'Calorias para 150g devem ser 195');
assert.equal(result150g.protein_g, 3.8, 'Proteína para 150g deve ser 3.8g');
assert.equal(result150g.carbs_g, 42, 'Carboidratos para 150g devem ser 42g');
assert.equal(result150g.fiber_g, 2.3, 'Fibras para 150g devem ser 2.3g');
assert.equal(result150g.hasIncompleteData, false, 'Alimento possui todos os dados');
console.log('✓ 1. nutritionEngine: Cálculo proporcional por 100g validado com sucesso.');

// 2. Teste de Avaliação de Fibras
const fiberEval = evaluateFiberDensity(30, 2000);
assert.equal(fiberEval.status, 'optimal', '30g em 2000 kcal (15g/1000kcal) deve ser optimal');
console.log('✓ 2. nutritionEngine: Densidade de fibras avaliada corretamente.');

// 3. Teste de Média Móvel de Peso e Amostragem Mínima
const recordsInsuficientes = [
  { date: '2026-10-10', weight_kg: 75.0 },
  { date: '2026-10-12', weight_kg: 74.8 },
];
const trendInsuf = analyzeWeightTrend(recordsInsuficientes, new Date('2026-10-12'));
assert.equal(trendInsuf.isSufficientData, false, 'Menos de 3 pesagens deve ser marcado como insuficiente');
assert.equal(trendInsuf.trendDirection, 'insufficient_data');

const recordsSuficientes = [
  { date: '2026-10-06', weight_kg: 76.0 },
  { date: '2026-10-08', weight_kg: 75.6 },
  { date: '2026-10-10', weight_kg: 75.2 },
  { date: '2026-10-12', weight_kg: 75.0 },
];
const trendSuf = analyzeWeightTrend(recordsSuficientes, new Date('2026-10-12'));
assert.equal(trendSuf.isSufficientData, true, '4 pesagens na semana devem ser suficientes');
assert.ok(trendSuf.movingAverage7d !== null, 'Média móvel deve estar calculada');
console.log(`✓ 3. trendsEngine: Média móvel calculada (${trendSuf.movingAverage7d} kg) com validação de amostragem.`);

// 4. Teste de Explicação de Flutuação Hídrica
const flutuacao = explainDailyFluctuation(76.2, 75.0);
assert.match(flutuacao, /retenção de líquidos/i, 'Salto de 1.2kg deve explicar retenção hídrica');
console.log('✓ 4. trendsEngine: Amortecimento educativo de flutuação diária validado.');

// 5. Teste de Insights Explicáveis e Meta Adaptativa
const insights = generateSmartInsights({
  daysLoggedPast7d: 6,
  totalWorkoutsPast7d: 1,
  weeklyWorkoutsTarget: 4,
  avgCaloriesPast7d: 1800,
  targetCalories: 1900,
  avgProteinPast7d: 70,
  targetProtein: 120,
  avgFiberPast7d: 12,
  avgWaterPast7d: 1400,
  targetWater: 2500,
  weightTrendKg: -0.4,
  sampleWeightCount7d: 4,
});

const ids = insights.map((i) => i.id);
assert.ok(ids.includes('consistency_high'), 'Deve incluir alta consistência');
assert.ok(ids.includes('protein_deficit'), 'Deve alertar déficit de proteína');
assert.ok(ids.includes('workouts_adaptive_suggestion'), 'Deve sugerir meta adaptativa de treinos');
assert.ok(ids.includes('weight_trend_steady'), 'Deve reconhecer perda de peso sustentável');
console.log(`✓ 5. insightsEngine: ${insights.length} insights gerados com justificativas factuais.`);

// 6. Teste de Pontuação de Hábitos e Ranking Anti-Fraude
const weekHabits = [
  { date: '2026-10-06', distinctMealsCount: 3, exerciseMinutes: 40, waterLoggedMl: 2500, waterTargetMl: 2500 },
  { date: '2026-10-07', distinctMealsCount: 2, exerciseMinutes: 30, waterLoggedMl: 2200, waterTargetMl: 2500 },
  { date: '2026-10-08', distinctMealsCount: 3, exerciseMinutes: 0, waterLoggedMl: 2600, waterTargetMl: 2500 },
  { date: '2026-10-09', distinctMealsCount: 2, exerciseMinutes: 45, waterLoggedMl: 2500, waterTargetMl: 2500 },
  { date: '2026-10-10', distinctMealsCount: 2, exerciseMinutes: 30, waterLoggedMl: 2100, waterTargetMl: 2500 },
];
const score = calculateWeeklyHabitScore(weekHabits);
assert.equal(score.foodDays, 5, '5 dias com refeições válidas');
assert.equal(score.exerciseDays, 4, '4 dias com treinos válidos');
assert.equal(score.waterDays, 5, '5 dias com meta de água');
assert.equal(score.streakBonus, 20, 'Bônus de consistência semanal');
// 5*10 + 4*10 + 5*5 + 20 = 50 + 40 + 25 + 20 = 135
assert.equal(score.totalPoints, 135, 'Total de pontos deve ser 135');
console.log(`✓ 6. scoringEngine: Pontuação de hábitos calculada perfeitamente (${score.totalPoints} pts).`);

console.log('\n🎉 TODOS OS TESTES DOS MOTORES DE DOMÍNIO PASSARAM COM SUCESSO!');
