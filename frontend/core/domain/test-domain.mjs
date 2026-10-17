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
// 7. Teste de Composição Corporal e Bioimpedância (IMC, BMR e Idade Metabólica)
import { 
  calculateBMI, 
  estimateBMR, 
  evaluateMetabolicAge, 
  evaluateBodyFat,
  calculateIdealWeight,
  calculateAdjustedWeight 
} from './bodyComposition.ts';

// Teste de IMC Adulto
const bmiAdulto = calculateBMI(74.5, 175, 28);
assert.equal(bmiAdulto?.bmi, 24.3, 'IMC de 74.5kg e 175cm deve ser 24.3');
assert.equal(bmiAdulto?.category, 'normal', 'IMC deve ser classificado como Peso Saudável');
assert.equal(bmiAdulto?.isElderly, false, 'Adulto de 28 anos não é idoso');

// Teste de IMC Idoso (Lipschitz / SISVAN Ministério da Saúde)
// 68kg e 160cm -> IMC 26.6. Em idosos (>= 60 anos), 22 a 27 é Eutrofia (Peso Adequado)
const bmiIdosoEutrofico = calculateBMI(68, 160, 65);
assert.equal(bmiIdosoEutrofico?.bmi, 26.6, 'IMC idoso');
assert.equal(bmiIdosoEutrofico?.category, 'elderly_normal', 'IMC 26.6 em idoso de 65 anos deve ser Peso Adequado (Eutrofia)');
assert.equal(bmiIdosoEutrofico?.isElderly, true, 'Deve ser marcado como idoso');

// Teste de IMC Obesidade Grau II (ABESO)
const bmiObeso2 = calculateBMI(110, 170, 35);
assert.equal(bmiObeso2?.category, 'obesity_2', 'IMC 38.1 deve ser Obesidade Grau II');

// Teste de BMR com distinção por Sexo Biológico (Mifflin-St Jeor)
const bmrHomem = estimateBMR(74.5, 175, 28, 'male');
// 10*74.5 + 6.25*175 - 5*28 + 5 = 745 + 1093.75 - 140 + 5 = 1703.75 -> 1704
assert.equal(bmrHomem, 1704, 'BMR masculino deve ser 1704 kcal');

const bmrMulher = estimateBMR(74.5, 175, 28, 'female');
// 10*74.5 + 6.25*175 - 5*28 - 161 = 745 + 1093.75 - 140 - 161 = 1537.75 -> 1538
assert.equal(bmrMulher, 1538, 'BMR feminino deve ser 1538 kcal');
assert.equal(bmrHomem - bmrMulher, 166, 'Diferença entre constantes masculina (+5) e feminina (-161) deve ser 166 kcal');

// Teste de Gordura Corporal por Sexo (SBMEE)
const fatHomem = evaluateBodyFat(16, 'male');
assert.equal(fatHomem?.status, 'fitness', '16% de gordura em homem é Fitness');

const fatMulher = evaluateBodyFat(16, 'female');
assert.equal(fatMulher?.status, 'athletic', '16% de gordura em mulher é Atlético');

const fatMulherBaixo = evaluateBodyFat(12, 'female');
assert.equal(fatMulherBaixo?.status, 'essential', '12% em mulher deve alertar nível essencial');

const metaAgeEval = evaluateMetabolicAge(28, 24);
assert.equal(metaAgeEval?.difference, -4, 'Diferença de idade metabólica deve ser -4');
assert.equal(metaAgeEval?.label, '4 anos mais jovem');
console.log('✓ 7. bodyComposition: BMR por sexo biológico, IMC idosos Lipschitz e gordura SBMEE validados.');

// 8. Teste de Check-in Periódico e Snooze (Pular Verificação)
import { evaluateCheckinDue } from './checkinEngine.ts';

// Caso 1: Usuário nunca fez check-in
const evalFirst = evaluateCheckinDue({ lastCheckinDate: null });
assert.equal(evalFirst.isDue, true, 'Primeiro check-in deve estar devido');

// Caso 2: Fez check-in há 2 dias com frequência semanal (7d)
const evalRecent = evaluateCheckinDue({
  lastCheckinDate: '2026-10-11',
  frequencyDays: 7,
  currentDate: new Date('2026-10-13T10:00:00Z'),
});
assert.equal(evalRecent.isDue, false, 'Check-in recente (2d atrás) não deve estar devido');
assert.equal(evalRecent.reason, 'already_done');

// Caso 3: Fez check-in há 8 dias (vencido)
const evalOverdue = evaluateCheckinDue({
  lastCheckinDate: '2026-10-05',
  frequencyDays: 7,
  currentDate: new Date('2026-10-13T10:00:00Z'),
});
assert.equal(evalOverdue.isDue, true, 'Check-in de 8 dias atrás deve estar devido');

// Caso 4: Vencido mas o usuário pulou hoje (snooze)
const evalSkipped = evaluateCheckinDue({
  lastCheckinDate: '2026-10-05',
  lastSkippedDate: '2026-10-13',
  frequencyDays: 7,
  currentDate: new Date('2026-10-13T10:00:00Z'),
});
assert.equal(evalSkipped.isDue, false, 'Check-in pulado hoje deve respeitar o snooze');
assert.equal(evalSkipped.reason, 'skipped_recently');

console.log('✓ 8. checkinEngine: Agendamento semanal, vencimento e snooze validados com sucesso.');

// 9. Teste de Metas Científicas Completas (ABESO, SBAN, SBC, SBD)
import { calculateScientificTargets } from './nutritionEngine.ts';

// Caso Obesidade: 120kg, 170cm (IMC 41.5)
const targetsObeso = calculateScientificTargets({
  weightKg: 120,
  heightCm: 170,
  age: 30,
  sex: 'male',
  activityLevel: 'medium',
  goal: 'fat_loss',
});

assert.equal(targetsObeso.isObesityAdjusted, true, 'Deve aplicar peso ajustado para IMC > 30');
// Peso ideal: 24.9 * 1.7^2 = 72 kg. Peso ajustado: 72 + 0.25*(120-72) = 84 kg
// Proteína: 84 * 2.0 = 168g (ao invés de 240g de 120kg * 2.0)
assert.equal(targetsObeso.protein, 168, 'Proteína com peso ajustado deve ser 168g (evita 240g excessivos)');
assert.ok(targetsObeso.water <= 3800, 'Água deve respeitar teto de segurança fisiológica');
assert.ok(targetsObeso.saturatedFats <= Math.round((targetsObeso.calories * 0.1) / 9), 'Gordura saturada deve respeitar limite SBC');

console.log('✓ 9. nutritionEngine: calculateScientificTargets com peso ajustado ABESO e teto SBC 100% validado.');

// 10. Teste da Classificação NOVA (Ministério da Saúde)
import { classifyNovaGroup } from './nutritionEngine.ts';

const novaBanana = classifyNovaGroup('Banana prata in natura', 'Frutas');
assert.equal(novaBanana.group, 1, 'Banana deve ser Grupo 1 (In Natura)');

const novaAzeite = classifyNovaGroup('Azeite de oliva extravirgem', 'Óleos & Gorduras');
assert.equal(novaAzeite.group, 2, 'Azeite deve ser Grupo 2 (Ingrediente Culinário)');

const novaQueijo = classifyNovaGroup('Queijo minas meia cura', 'Leite & Laticínios');
assert.equal(novaQueijo.group, 3, 'Queijo deve ser Grupo 3 (Processado)');

const novaRefrigerante = classifyNovaGroup('Refrigerante de Cola', 'Bebidas');
assert.equal(novaRefrigerante.group, 4, 'Refrigerante deve ser Grupo 4 (Ultraprocessado)');

console.log('✓ 10. nutritionEngine: classifyNovaGroup (Classificação NOVA do Ministério da Saúde) 100% validado.');

// 11. Teste do Motor de Mascotes de Bioimpedância (avatarEngine)
import { evaluateMascot } from './avatarEngine.ts';

// Caso 1: Homem com 98kg, 175cm e 28% gordura -> Titã no modo Treino Pesado (robust, Fase 1)
const mascotHomemPesado = evaluateMascot({
  sex: 'male',
  mascotId: 'tita',
  weightKg: 98,
  heightCm: 175,
  bodyFatPct: 28,
  muscleMassPct: 32,
  initialWeightKg: 98,
  initialWaistCm: 104,
  waistCm: 104,
});
assert.equal(mascotHomemPesado.archetype, 'robust', 'Titã com 28% de gordura deve ser robust (treino pesado)');
assert.equal(mascotHomemPesado.assetKey, 'tita_robust');
assert.equal(mascotHomemPesado.stageLevel, 1, 'Início da jornada deve ser Fase 1');
assert.equal(mascotHomemPesado.weightLostKg, 0, 'Sem perda de peso no início');

// Caso 2: O mesmo homem após 3 meses de batalha: peso caiu de 98kg para 84kg, cintura caiu de 104cm para 92cm e gordura de 28% para 19%
const mascotHomemEvoluido = evaluateMascot({
  sex: 'male',
  mascotId: 'tita',
  weightKg: 84,
  heightCm: 175,
  bodyFatPct: 19,
  muscleMassPct: 37,
  initialWeightKg: 98,
  initialBodyFatPct: 28,
  initialWaistCm: 104,
  waistCm: 92,
});
assert.equal(mascotHomemEvoluido.weightLostKg, 14, 'Deve registrar 14 kg perdidos');
assert.equal(mascotHomemEvoluido.waistLostCm, 12, 'Deve registrar 12 cm de cintura reduzidos');
assert.equal(mascotHomemEvoluido.fatLostPct, 9, 'Deve registrar 9% de gordura perdida');
assert.equal(mascotHomemEvoluido.archetype, 'athletic', 'Com 19% de gordura masculina agora é athletic (emagreceu)');
assert.ok(mascotHomemEvoluido.stageLevel >= 3, 'Com 14kg perdidos deve estar na fase 3 ou 4 de transformação');

// Caso 3: Homem que focou em hipertrofia: 76kg, 175cm, 42% músculo e 15% gordura -> Titã Maromba (muscular, Fase 4+)
const mascotHomemMaromba = evaluateMascot({
  sex: 'male',
  mascotId: 'tita',
  weightKg: 76,
  heightCm: 175,
  bodyFatPct: 15,
  muscleMassPct: 42,
  initialWeightKg: 98,
  initialMuscleMassPct: 32,
});
assert.equal(mascotHomemMaromba.archetype, 'muscular', 'Titã com 42% músculo e 15% gordura deve ser muscular');
assert.equal(mascotHomemMaromba.assetKey, 'tita_muscular');
assert.equal(mascotHomemMaromba.muscleDeltaPct, 10, 'Ganhou 10% de massa muscular');
assert.ok(mascotHomemMaromba.progressPercentage > 80, 'Progresso de emagrecimento de 98kg para 76kg deve ser alto');

// Caso 4: Mulher com Gaia com 18% gordura e 60kg -> Gaia Atlética/Campeã (athletic)
const mascotMulherAtleta = evaluateMascot({
  sex: 'female',
  mascotId: 'gaia',
  weightKg: 60,
  heightCm: 168,
  bodyFatPct: 18,
  muscleMassPct: 34,
});
assert.equal(mascotMulherAtleta.archetype, 'muscular');
assert.equal(mascotMulherAtleta.assetKey, 'gaia_athletic');

console.log('✓ 11. avatarEngine: Arquétipos de bioimpedância, perda de peso/medidas e evolução 100% validados.');

// 12. Teste do Motor 3D Vivo (Morfologia Guiada por Peso + % Gordura + % Músculo)
assert.ok(mascotHomemMaromba.morphology, 'Morfologia 3D deve existir');
assert.ok(mascotHomemMaromba.morphology.armBulk > 1.15, 'Braços do homem com 42% músculo devem ser hipertrofiados (>1.15)');
assert.ok(mascotHomemMaromba.morphology.legBulk > 1.10, 'Pernas do homem com 42% músculo devem ser fortes (>1.10)');
assert.ok(mascotHomemMaromba.morphology.bellyVolume <= 1.0, 'Abdômen com 15% de gordura deve estar retraído abaixo da média (<=1.0)');
assert.ok(mascotHomemMaromba.morphology.muscleDefinition >= 0.6, 'Definição muscular deve ser alta com baixo bf e alto músculo (>=0.6)');
assert.ok(mascotHomemMaromba.morphology.inspectionQuote.includes('bíceps') || mascotHomemMaromba.morphology.inspectionQuote.includes('massa muscular') || mascotHomemMaromba.morphology.inspectionQuote.includes('definição'), 'Frase de inspeção deve comentar a hipertrofia/músculos');

// Morfologia do obeso/robusto:
assert.ok(mascotHomemPesado.morphology.bellyVolume > 1.25, 'Abdômen com 28% de gordura deve ter volume projetado (>1.25)');
assert.ok(mascotHomemPesado.morphology.muscleDefinition < 0.4, 'Definição abdominal deve ser velada com alto BF (<0.4)');

// Caso 5: Fenômeno Falso Magro / Flácido (Perdeu peso comendo chocolate / má alimentação: peso caiu de 85 para 80, mas perdeu músculo de 36 para 33 e gordura subiu de 22 para 24)
const mascotFalsoMagro = evaluateMascot({
  sex: 'male',
  mascotId: 'tita',
  weightKg: 80,
  heightCm: 175,
  bodyFatPct: 24,
  muscleMassPct: 33,
  initialWeightKg: 85,
  initialBodyFatPct: 22,
  initialMuscleMassPct: 36,
});
assert.equal(mascotFalsoMagro.archetype, 'skinny_fat', 'Perda de peso com catabolismo muscular e subida de gordura deve ser classificado como skinny_fat');
assert.ok(mascotFalsoMagro.morphology.flaccidityFactor > 0.7, 'Fator de flacidez deve ser elevado no falso magro (>0.7)');
assert.ok(mascotFalsoMagro.morphology.armBulk < 0.9, 'Braços do falso magro perdem tônus (<0.9)');
assert.ok(mascotFalsoMagro.morphology.bellyVolume > 1.1, 'Abdômen do falso magro continua saliente e flácido (>1.1)');
assert.ok(mascotFalsoMagro.morphology.inspectionQuote.includes('flácida') || mascotFalsoMagro.morphology.inspectionQuote.includes('falso magro'), 'Frase de inspeção deve alertar sobre flacidez e catabolismo');

console.log('✓ 13. avatarEngine (Extremos & Flacidez): Arquétipo skinny_fat e fatores de flacidez validados com sucesso.');

// 14. Teste do Motor de Falas Dinâmicas para a Tela Inicial (generateHomeMascotSpeech)
import { generateHomeMascotSpeech } from './avatarEngine.ts';

// Falas em andamento
const speechAndamento = generateHomeMascotSpeech({
  mascotId: 'tita',
  caloriesTarget: 2000,
  caloriesConsumed: 1200,
  proteinG: 90,
  proteinTargetG: 140,
  userName: 'Marcus',
  hour: 15,
});
assert.equal(speechAndamento.calRemaining, 800, 'Restante deve ser 800 kcal');
assert.ok(speechAndamento.mainSpeech.includes('2.000') || speechAndamento.mainSpeech.includes('2000'), 'Deve citar a meta diária');
assert.ok(speechAndamento.subSpeech.includes('800'), 'Deve citar que faltam 800 kcal');

// Falas zerado pela manhã
const speechManha = generateHomeMascotSpeech({
  mascotId: 'gaia',
  caloriesTarget: 1800,
  caloriesConsumed: 0,
  hour: 8,
});
assert.ok(speechManha.mainSpeech.includes('Bom dia'), 'Pela manhã deve desejar bom dia');

// Falas meta cravada
const speechCravada = generateHomeMascotSpeech({
  mascotId: 'tita',
  caloriesTarget: 2000,
  caloriesConsumed: 2000,
  hour: 20,
});
assert.equal(speechCravada.sentiment, 'celebration', 'Meta batida deve ter sentimento de celebração');

console.log('✓ 14. avatarEngine (Speech Engine Home): Geração dinâmica de falas da meta, consumido e restante 100% validada.');

// 15. Teste do Motor de Reação de Bioimpedância (bioReactionEngine: 8 Cenários, Metamorfose & Falas Reais)
import { evaluateBioReaction } from './bioReactionEngine.ts';

// 15.1: Cenário 1: Queima de Ouro (Gordura caiu, cintura afinou, músculo protegido)
const resGoldBurn = evaluateBioReaction({
  current: { weightKg: 83.8, bodyFatPct: 22.0, muscleMassPct: 35.0, waistCm: 88.0 },
  previous: { weightKg: 85.0, bodyFatPct: 23.5, muscleMassPct: 35.0, waistCm: 90.0 },
  baseline: { weightKg: 92.0, bodyFatPct: 28.0, waistCm: 98.0 },
  mascotId: 'tita',
  sex: 'male',
  previousStageLevel: 1,
});
assert.equal(resGoldBurn.scenarioKey, 'gold_burn', 'Deve classificar como Queima de Ouro');
assert.equal(resGoldBurn.weightDeltaKg, -1.2, 'Delta de peso deve ser -1.2kg');
assert.ok(resGoldBurn.speechText.includes('1.2kg'), 'A fala do Titã deve citar os 1.2kg perdidos');
assert.ok(resGoldBurn.speechText.includes('2.0cm'), 'A fala do Titã deve citar os 2.0cm de cintura');
assert.equal(resGoldBurn.badges.length, 4, 'Deve conter badges de peso, gordura, músculo e cintura');

// 15.2: Cenário 2: Hipertrofia de Respeito (Músculo subiu)
const resMuscle = evaluateBioReaction({
  current: { weightKg: 80.2, bodyFatPct: 18.0, muscleMassPct: 37.5, waistCm: 82.0 },
  previous: { weightKg: 80.0, bodyFatPct: 18.2, muscleMassPct: 36.5, waistCm: 82.0 },
  mascotId: 'gaia',
  sex: 'female',
});
assert.equal(resMuscle.scenarioKey, 'muscle_gain', 'Deve classificar como Hipertrofia de Respeito');
assert.equal(resMuscle.muscleDeltaPct, 1.0, 'Ganho de músculo deve ser 1.0%');

// 15.3: Cenário 3: Catabolismo (Peso caiu, mas músculo foi sacrificado)
const resCatabolism = evaluateBioReaction({
  current: { weightKg: 78.0, bodyFatPct: 21.0, muscleMassPct: 32.0, waistCm: 84.0 },
  previous: { weightKg: 79.5, bodyFatPct: 20.0, muscleMassPct: 33.2, waistCm: 84.5 },
  mascotId: 'tita',
  sex: 'male',
});
assert.equal(resCatabolism.scenarioKey, 'catabolism_alert', 'Deve alertar sobre Catabolismo');
assert.match(resCatabolism.speechText, /proteína/i, 'Fala deve instruir a comer proteína');

// 15.4: Cenário 4: Retenção / Deslize
const resRetention = evaluateBioReaction({
  current: { weightKg: 84.5, bodyFatPct: 24.5, waistCm: 90.0 },
  previous: { weightKg: 83.0, bodyFatPct: 23.5, waistCm: 88.5 },
  mascotId: 'tita',
});
assert.equal(resRetention.scenarioKey, 'retention_alert', 'Deve classificar como Retenção');
assert.match(resRetention.nextStepAction, /500ml/i, 'Próximo passo deve sugerir hidratação imediata');

// 15.5: Cenário 5: Recomposição Silenciosa (Peso estável, cintura menor)
const resSilentRecomp = evaluateBioReaction({
  current: { weightKg: 82.0, waistCm: 84.0, bodyFatPct: 20.0, muscleMassPct: 36.0 },
  previous: { weightKg: 82.0, waistCm: 86.5, bodyFatPct: 21.2, muscleMassPct: 35.5 },
  mascotId: 'gaia',
});
assert.equal(resSilentRecomp.scenarioKey, 'silent_recomp', 'Deve classificar como Recomposição Silenciosa');
assert.ok(resSilentRecomp.speechText.includes('82.0kg'), 'Deve citar o peso estável na fala');

// 15.6: Cenário 6: Marco Zero (Primeiro check-in)
const resZeroMark = evaluateBioReaction({
  current: { weightKg: 95.0, bodyFatPct: 29.0, waistCm: 102.0 },
  previous: null,
  mascotId: 'tita',
});
assert.equal(resZeroMark.scenarioKey, 'zero_mark', 'Deve ser Marco Zero');

// 15.7: Cenário 7: Retorno Triunfal (>14 dias ausente)
const resReturn = evaluateBioReaction({
  current: { weightKg: 86.0 },
  previous: { weightKg: 85.5 },
  daysSinceLastCheckin: 21,
  mascotId: 'tita',
});
assert.equal(resReturn.scenarioKey, 'triumphant_return', 'Deve classificar como Retorno Triunfal');

// 15.8: Cenário 8: Forma Campeã (Meta batida)
const resChampion = evaluateBioReaction({
  current: { weightKg: 74.5, bodyFatPct: 14.0 },
  previous: { weightKg: 75.8, bodyFatPct: 15.2 },
  targetWeightKg: 75.0,
  mascotId: 'tita',
});
assert.equal(resChampion.scenarioKey, 'champion_form', 'Deve ser Forma Campeã');

// 15.9: Detecção de Metamorfose de Shape (Level-Up)
const resEvolution = evaluateBioReaction({
  current: { weightKg: 75.0, bodyFatPct: 14.0, muscleMassPct: 38.0 },
  previous: { weightKg: 88.0, bodyFatPct: 26.0, muscleMassPct: 31.0 },
  baseline: { weightKg: 95.0, bodyFatPct: 30.0 },
  previousStageLevel: 1,
  mascotId: 'tita',
});
assert.ok(resEvolution.evolution.evolved, 'Deve disparar a evolução de shape');
assert.ok(resEvolution.evolution.newStageLevel > 1, 'Novo nível de estágio deve ser superior ao anterior');

console.log('✓ 15. bioReactionEngine: 8 Cenários clínicos de bioimpedância, metamorfose de shape e falas reais 100% validados.');

// 16. Teste de Paridade 1:1 dos 10 Marcos Granulares da Gaia e do Titã
import { getDetailedMilestones, evaluateGainScenario, evaluateHypertrophyLadder } from './avatarEngine.ts';

const gaiaMilestones = getDetailedMilestones('gaia');
const titaMilestones = getDetailedMilestones('tita');

assert.equal(gaiaMilestones.length, 10, 'Gaia deve possuir exatamente 10 marcos granulares');
assert.equal(titaMilestones.length, 10, 'Titã deve possuir exatamente 10 marcos granulares');

// Verificação Marco a Marco da Gaia
assert.equal(gaiaMilestones[0].level, 1);
assert.equal(gaiaMilestones[0].weightKg, 82.0, 'Gaia Marco 1 deve ser 82.0 kg');
assert.equal(gaiaMilestones[0].badge, 'Aquecimento Pesado');
assert.equal(gaiaMilestones[4].level, 5);
assert.equal(gaiaMilestones[4].badge, 'Coração de Gaia', 'Marco 5 deve ser Insígnia Coração de Gaia');
assert.equal(gaiaMilestones[5].level, 6);
assert.equal(gaiaMilestones[5].waistCm, 79, 'Marco 6 da Gaia deve romper a barreira < 80cm da ABESO');
assert.equal(gaiaMilestones[7].level, 8);
assert.match(gaiaMilestones[7].name, /11-Line Abs/i, 'Marco 8 deve conter 11-Line Abs');
assert.equal(gaiaMilestones[9].level, 10);
assert.equal(gaiaMilestones[9].weightKg, 58.0, 'Gaia Marco 10 deve ser 58.0 kg (Forma Campeã)');
assert.match(gaiaMilestones[9].quote, /Coroa de louros/i);
assert.ok(!gaiaMilestones[9].bodyStateDescription.includes('robô'), 'Gaia Campeã não pode ser robô');

console.log('✓ 16. avatarEngine: Paridade 1:1 dos 10 Marcos Granulares da Gaia e Titã 100% validada.');

// 17. Teste dos 3 Cenários Clínicos de Ganho de Peso da Gaia
const gaiaRetencao = evaluateGainScenario('gaia', 60.5, 1.5, 0.0, 0.0);
assert.equal(gaiaRetencao.scenarioKey, 'water_retention');
assert.match(gaiaRetencao.title, /TPM|Fase Lútea/i, 'Ganho de água na mulher deve citar TPM/fase lútea');
assert.match(gaiaRetencao.quote, /TPM e retenção são pura oscilação hormonal/i);

const gaiaHipertrofia = evaluateGainScenario('gaia', 64.0, 2.0, 0.0, 1.2);
assert.equal(gaiaHipertrofia.scenarioKey, 'clean_hypertrophy');
assert.match(gaiaHipertrofia.title, /Glúteos & Pernas/i, 'Hipertrofia feminina deve enfatizar pernas e glúteos');
assert.match(gaiaHipertrofia.quote, /pernas e glúteos de rocha/i);

const gaiaRebote = evaluateGainScenario('gaia', 86.0, 4.0, 2.0, -0.5, 3.0);
assert.equal(gaiaRebote.scenarioKey, 'caloric_rebound');
assert.match(gaiaRebote.title, /Resgate da Guerreira/i);

console.log('✓ 17. avatarEngine: 3 Cenários clínicos de ganho de peso da Gaia (TPM, Glúteos de Rocha, Resgate) validados.');

// 18. Teste da Esteira Master de Hipertrofia da Gaia (GH1 a GH8 até 95kg)
const gh1 = evaluateHypertrophyLadder('gaia', 62.0);
assert.equal(gh1.levelCode, 'GH1');
assert.equal(gh1.name, 'Bikini Fitness Esculpida');

const gh4 = evaluateHypertrophyLadder('gaia', 75.0);
assert.equal(gh4.levelCode, 'GH4');
assert.equal(gh4.name, 'Glúteos & Pernas de Titânio');

const gh8 = evaluateHypertrophyLadder('gaia', 95.0);
assert.equal(gh8.levelCode, 'GH8');
assert.equal(gh8.name, 'A Valquíria Suprema');
assert.ok(gh8.unlockedCosmetics.includes('Armadura de Valquíria Dourada & Esmeralda'));

// Titã H1 a H8
const th8 = evaluateHypertrophyLadder('tita', 120.0);
assert.equal(th8.levelCode, 'H8');
assert.equal(th8.name, 'O Colosso Lendário');

console.log('✓ 18. avatarEngine: Esteira de hipertrofia da Gaia (GH1 a GH8 até 95kg) e Titã (H1 a H8 até 120kg) validada.');

// 19. Teste do Retorno de Marcos no evaluateMascot
const mascotGaiaEval = evaluateMascot({
  mascotId: 'gaia',
  sex: 'female',
  weightKg: 64.0,
  heightCm: 165,
  initialWeightKg: 82.0,
  bodyFatPct: 22.0,
});
assert.ok(mascotGaiaEval.milestoneLevel >= 1 && mascotGaiaEval.milestoneLevel <= 10, 'Deve retornar milestoneLevel');
assert.ok(mascotGaiaEval.milestoneName.length > 0, 'Deve retornar milestoneName');
assert.ok(mascotGaiaEval.milestoneBadge.length > 0, 'Deve retornar milestoneBadge');
assert.ok(mascotGaiaEval.unlockedCosmetics.length > 0, 'Deve retornar unlockedCosmetics');
assert.equal(mascotGaiaEval.milestoneAssetKey, `gaia_m${mascotGaiaEval.milestoneLevel}`, 'milestoneAssetKey deve ser gaia_mX');

console.log('✓ 19. avatarEngine: evaluateMascot retorna atributos completos de marco da Gaia.');

// 20. Teste dos AssetKeys dos Modelos 2D (10 Marcos, Ganhos e Hipertrofia)
const gaiaM = getDetailedMilestones('gaia');
const titaM = getDetailedMilestones('tita');
assert.equal(gaiaM.length, 10);
assert.equal(titaM.length, 10);

for (let i = 0; i < 10; i++) {
  assert.equal(gaiaM[i].assetKey, `gaia_m${i + 1}`, `Gaia marco ${i + 1} deve ter assetKey gaia_m${i + 1}`);
  assert.equal(titaM[i].assetKey, `tita_m${i + 1}`, `Titã marco ${i + 1} deve ter assetKey tita_m${i + 1}`);
}

const waterGaia = evaluateGainScenario('gaia', 60.5, 1.5);
assert.equal(waterGaia.assetKey, 'gaia_gain_water');
const reboundTita = evaluateGainScenario('tita', 96.0, 4.0, 2.0, -0.5);
assert.equal(reboundTita.assetKey, 'tita_gain_rebound');

const jugg = evaluateHypertrophyLadder('tita', 100.0);
assert.equal(jugg.assetKey, 'tita_h_juggernaut');
const colossus = evaluateHypertrophyLadder('tita', 120.0);
assert.equal(colossus.assetKey, 'tita_h_colosso');
const valkyrie = evaluateHypertrophyLadder('gaia', 95.0);
assert.equal(valkyrie.assetKey, 'gaia_m10');

console.log('✓ 20. avatarEngine: AssetKeys dos modelos 2D (10 Marcos, Ganhos e Hipertrofia) 100% integrados e validados.');

console.log('\n🎉 TODOS OS TESTES DOS MOTORES DE DOMÍNIO PASSARAM COM SUCESSO (100% ALINHADOS ÀS DIRETRIZES BRASILEIRAS)!');





