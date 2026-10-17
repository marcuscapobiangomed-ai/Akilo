/**
 * nutritionEngine.ts
 * Motor determinístico de cálculos nutricionais (100% desacoplado de APIs externas).
 * Normalização por 100g/100ml, conversão de porções, perfil lipídico e métricas de qualidade.
 */

export interface NutrientBase {
  base_qty: number; // Geralmente 100g ou 100ml
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  saturated_fats_g?: number | null;
  monounsaturated_fats_g?: number | null;
  polyunsaturated_fats_g?: number | null;
  trans_fats_g?: number | null;
  cholesterol_mg?: number | null;
  fiber_g?: number | null;
  sodium_mg?: number | null;
}

export interface CalculatedNutrients {
  qty: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  saturated_fats_g: number;
  monounsaturated_fats_g: number;
  polyunsaturated_fats_g: number;
  trans_fats_g: number;
  cholesterol_mg: number;
  fiber_g: number;
  sodium_mg: number;
  hasIncompleteData: boolean;
  macroPercentages: {
    protein: number;
    carbs: number;
    fats: number;
  };
  lipidBreakdown: {
    goodFatsRatio: number; // % (mono + poli) / total
    saturatedPercentage: number; // % saturada / total
    hasTransFat: boolean;
  };
}

/**
 * Calcula os nutrientes com base na porção consumida pelo usuário.
 */
export function calculatePortion(
  base: NutrientBase,
  qty: number,
  unit: string = 'g'
): CalculatedNutrients {
  const safeBaseQty = base.base_qty && base.base_qty > 0 ? base.base_qty : 100;
  const ratio = Math.max(0, qty) / safeBaseQty;

  const calories = Math.round(Math.max(0, base.calories || 0) * ratio * 10) / 10;
  const protein_g = Math.round(Math.max(0, base.protein_g || 0) * ratio * 10) / 10;
  const carbs_g = Math.round(Math.max(0, base.carbs_g || 0) * ratio * 10) / 10;
  const fats_g = Math.round(Math.max(0, base.fats_g || 0) * ratio * 10) / 10;

  // Perfil Lipídico Detalhado
  const saturated_fats_g = Math.round(Math.max(0, base.saturated_fats_g || 0) * ratio * 10) / 10;
  const monounsaturated_fats_g = Math.round(Math.max(0, base.monounsaturated_fats_g || 0) * ratio * 10) / 10;
  const polyunsaturated_fats_g = Math.round(Math.max(0, base.polyunsaturated_fats_g || 0) * ratio * 10) / 10;
  const trans_fats_g = Math.round(Math.max(0, base.trans_fats_g || 0) * ratio * 100) / 100;
  const cholesterol_mg = Math.round(Math.max(0, base.cholesterol_mg || 0) * ratio * 10) / 10;
  
  // Tratamento de dados nulos/ausentes
  const hasIncompleteData = base.fiber_g === null || base.fiber_g === undefined;
  const fiber_g = base.fiber_g != null ? Math.round(Math.max(0, base.fiber_g) * ratio * 10) / 10 : 0;
  const sodium_mg = base.sodium_mg != null ? Math.round(Math.max(0, base.sodium_mg) * ratio * 10) / 10 : 0;

  // Distribuição percentual de calorias por macronutriente (4-4-9 kcal/g)
  const proteinKcal = protein_g * 4;
  const carbsKcal = carbs_g * 4;
  const fatsKcal = fats_g * 9;
  const totalMacroKcal = proteinKcal + carbsKcal + fatsKcal;

  let macroPercentages = { protein: 0, carbs: 0, fats: 0 };
  if (totalMacroKcal > 0) {
    macroPercentages = {
      protein: Math.round((proteinKcal / totalMacroKcal) * 100),
      carbs: Math.round((carbsKcal / totalMacroKcal) * 100),
      fats: Math.round((fatsKcal / totalMacroKcal) * 100),
    };
  }

  // Divisão lipídica interna (gorduras boas vs saturadas)
  const goodFats = monounsaturated_fats_g + polyunsaturated_fats_g;
  const goodFatsRatio = fats_g > 0 ? Math.round((goodFats / fats_g) * 100) : 0;
  const saturatedPercentage = fats_g > 0 ? Math.round((saturated_fats_g / fats_g) * 100) : 0;
  const hasTransFat = trans_fats_g > 0.05;

  return {
    qty,
    unit,
    calories,
    protein_g,
    carbs_g,
    fats_g,
    saturated_fats_g,
    monounsaturated_fats_g,
    polyunsaturated_fats_g,
    trans_fats_g,
    cholesterol_mg,
    fiber_g,
    sodium_mg,
    hasIncompleteData,
    macroPercentages,
    lipidBreakdown: {
      goodFatsRatio,
      saturatedPercentage,
      hasTransFat,
    },
  };
}

/**
 * Avalia a qualidade do perfil lipídico com base nas diretrizes da OMS e SBC.
 * Limite de Gordura Saturada: máximo 10% do valor calórico diário total.
 */
export interface LipidProfileEvaluation {
  totalFats_g: number;
  saturatedFats_g: number;
  goodFats_g: number;
  goodFatsRatio: number;
  saturatedCaloriesPercentage: number;
  isSaturatedExcessive: boolean;
  hasTransFat: boolean;
  status: 'excellent' | 'balanced' | 'high_saturated' | 'trans_alert';
  message: string;
}

export function evaluateLipidProfile(
  fats_g: number,
  saturated_g: number,
  monounsaturated_g: number,
  polyunsaturated_g: number,
  trans_g: number,
  totalCalories: number
): LipidProfileEvaluation {
  const safeTotalCalories = Math.max(1, totalCalories);
  const saturatedKcal = (saturated_g || 0) * 9;
  const saturatedCaloriesPercentage = Math.round((saturatedKcal / safeTotalCalories) * 100);
  const goodFats = (monounsaturated_g || 0) + (polyunsaturated_g || 0);
  const totalFats = fats_g || 0;
  const goodFatsRatio = totalFats > 0 ? Math.round((goodFats / totalFats) * 100) : 0;
  const hasTransFat = (trans_g || 0) > 0.1;
  const isSaturatedExcessive = saturatedCaloriesPercentage > 10;

  let status: LipidProfileEvaluation['status'] = 'balanced';
  let message = 'Distribuição de lipídios em equilíbrio saudável.';

  if (hasTransFat) {
    status = 'trans_alert';
    message = 'Atenção: presença de gordura trans industrializada. Recomenda-se evitar o consumo frequente.';
  } else if (isSaturatedExcessive) {
    status = 'high_saturated';
    message = `Gordura saturada em ${saturatedCaloriesPercentage}% das calorias diárias (meta OMS: abaixo de 10%).`;
  } else if (goodFatsRatio >= 60) {
    status = 'excellent';
    message = 'Excelente perfil lipídico! Predomínio de gorduras benéficas anti-inflamatórias (mono e poli-insaturadas).';
  }

  return {
    totalFats_g: Math.round(totalFats * 10) / 10,
    saturatedFats_g: Math.round((saturated_g || 0) * 10) / 10,
    goodFats_g: Math.round(goodFats * 10) / 10,
    goodFatsRatio,
    saturatedCaloriesPercentage,
    isSaturatedExcessive,
    hasTransFat,
    status,
    message,
  };
}

/**
 * Avalia densidade nutricional de fibras (Meta recomendada OMS: >= 14g por 1000 kcal).
 */
export function evaluateFiberDensity(totalFiber: number, totalCalories: number): {
  densityPer1000Kcal: number;
  status: 'optimal' | 'moderate' | 'low';
  message: string;
} {
  if (totalCalories <= 0) {
    return { densityPer1000Kcal: 0, status: 'low', message: 'Sem registros calóricos hoje.' };
  }

  const density = (totalFiber / totalCalories) * 1000;
  if (density >= 14) {
    return {
      densityPer1000Kcal: Math.round(density * 10) / 10,
      status: 'optimal',
      message: 'Excelente ingestão de fibras para a saciedade e saúde intestinal.',
    };
  } else if (density >= 10) {
    return {
      densityPer1000Kcal: Math.round(density * 10) / 10,
      status: 'moderate',
      message: 'Ingestão moderada de fibras. Frutas, vegetais e grãos integrais podem elevar este índice.',
    };
  } else {
    return {
      densityPer1000Kcal: Math.round(density * 10) / 10,
      status: 'low',
      message: 'Ingestão de fibras abaixo da referência para as calorias consumidas.',
    };
  }
}

export type BiologicalSex = 'male' | 'female';

export interface ScientificTargetsParams {
  weightKg: number;
  heightCm: number;
  age: number;
  sex?: BiologicalSex;
  activityLevel: 'low' | 'medium' | 'high';
  goal: 'fat_loss' | 'muscle_gain' | 'maintain';
}

export interface ScientificTargetsResult {
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  saturatedFats: number;
  fiber: number;
  water: number;
  workouts: number;
  isObesityAdjusted: boolean;
  effectiveWeightUsed: number;
}

/**
 * Calcula todas as metas diárias em total conformidade com as Diretrizes Brasileiras:
 * - ABESO (Obesidade e Peso Ajustado)
 * - SBAN (Macronutrientes e Hidratação)
 * - SBC (Teto de Gorduras Saturadas < 8-10% do VET)
 * - SBD (Densidade de Fibras >= 14g/1000 kcal)
 * - Mifflin-St Jeor por Sexo Biológico
 */
export function calculateScientificTargets(
  params: ScientificTargetsParams
): ScientificTargetsResult {
  const w = Math.max(30, params.weightKg || 70);
  const h = Math.max(100, params.heightCm || 170);
  const a = Math.max(12, params.age || 28);
  const sex: BiologicalSex = params.sex === 'female' ? 'female' : 'male';
  const activity = params.activityLevel || 'medium';
  const goal = params.goal || 'maintain';

  // 1. Taxa Metabólica Basal (BMR) com constante por sexo biológico (Mifflin-St Jeor)
  const sexConstant = sex === 'female' ? -161 : 5;
  const bmr = Math.round(10 * w + 6.25 * h - 5 * a + sexConstant);

  // 2. Multiplicadores de atividade física validados
  const multipliers: Record<'low' | 'medium' | 'high', number> = {
    low: 1.25,
    medium: 1.5,
    high: 1.75,
  };
  const workoutTargets: Record<'low' | 'medium' | 'high', number> = {
    low: 3,
    medium: 4,
    high: 5,
  };

  let tdee = Math.round(bmr * multipliers[activity]);

  // 3. Ajuste de déficit/superávit seguro (ABESO recomenda déficit de 400 a 600 kcal)
  // Preserva sempre a trava biológica de nunca ficar abaixo da TMB
  if (goal === 'fat_loss') {
    tdee = Math.max(bmr + 100, tdee - 450);
  } else if (goal === 'muscle_gain') {
    tdee += 300;
  }

  // 4. Avaliação de IMC e aplicação de Peso Ajustado para Obesidade (ABESO)
  const hM = h / 100;
  const bmi = w / (hM * hM);
  const isObese = bmi >= 30.0;
  
  // Peso Ideal (IMC 24.9) e Peso Ajustado
  const idealWeight = Math.round(24.9 * hM * hM * 10) / 10;
  const effectiveWeight = isObese 
    ? Math.round((idealWeight + 0.25 * (w - idealWeight)) * 10) / 10
    : w;

  // 5. Proteína baseada em massa corporal efetiva (2.0 g/kg em emagrecimento, 1.8 g/kg em outros)
  const proteinFactor = goal === 'fat_loss' ? 2.0 : 1.8;
  const protein = Math.round(effectiveWeight * proteinFactor);

  // 6. Gorduras Totais: ~25% do VET (SBAN: faixa de 20 a 35%)
  const fats = Math.round((tdee * 0.25) / 9);

  // 7. Teto de Gorduras Saturadas (SBC: < 8% do VET para cardioproteção)
  const saturatedFats = Math.max(10, Math.round((tdee * 0.08) / 9));

  // 8. Carboidratos: restante calórico respeitando o piso mínimo seguro
  const proteinKcal = protein * 4;
  const fatsKcal = fats * 9;
  const carbs = Math.max(50, Math.round((tdee - proteinKcal - fatsKcal) / 4));

  // 9. Fibras: 14g por 1000 kcal com piso de 25g/dia (SBD / OMS)
  const fiber = Math.max(25, Math.round((tdee / 1000) * 14));

  // 10. Hidratação: 35 ml/kg com limite de segurança fisiológica (SBAN)
  // Em obesidade, calcula sobre o peso ajustado para evitar sobrecarga renal
  const waterRaw = Math.round(effectiveWeight * 35);
  const water = Math.min(3800, Math.max(1800, waterRaw));

  return {
    bmr,
    tdee,
    calories: tdee,
    protein,
    carbs,
    fats,
    saturatedFats,
    fiber,
    water,
    workouts: workoutTargets[activity],
    isObesityAdjusted: isObese,
    effectiveWeightUsed: effectiveWeight,
  };
}

/**
 * Classificação NOVA (Guia Alimentar para a População Brasileira - Ministério da Saúde)
 * Reconhecida pela OMS e FAO como padrão-ouro em epidemiologia nutricional.
 */
export interface NovaClassification {
  group: 1 | 2 | 3 | 4;
  label: string;
  shortLabel: string;
  color: string;
  badgeBg: string;
  description: string;
}

export function classifyNovaGroup(name: string, category?: string | null): NovaClassification {
  const n = (name || '').toLowerCase();
  const c = (category || '').toLowerCase();

  // Grupo 4: Ultraprocessados (Evitar)
  const ultraKeywords = [
    'refrigerante', 'salgadinho', 'biscoito recheado', 'embutido', 'salsicha', 'linguiça calabresa',
    'nugget', 'hambúrguer industrializado', 'miojo', 'macarrão instantâneo', 'margarina',
    'fast food', 'achocolatado', 'doce industrializado', 'gelatina em pó', 'sorvete industrial',
    'tempero pronto', 'cubo de caldo', 'suco em pó', 'néctar', 'snack', 'batata frita congelada',
    'industrializados & lanches'
  ];
  if (ultraKeywords.some(k => n.includes(k) || c.includes(k))) {
    return {
      group: 4,
      label: 'Ultraprocessado (Grupo 4)',
      shortLabel: 'Ultraprocessado',
      color: '#ef4444',
      badgeBg: 'rgba(239, 68, 68, 0.15)',
      description: 'Formulação industrial com aromatizantes/conservantes. Evitar segundo o Guia Alimentar.',
    };
  }

  // Grupo 2: Ingredientes Culinários Processados (Usar com moderação)
  const ingredientKeywords = [
    'óleo', 'azeite', 'manteiga', 'banha', 'açúcar', 'sal', 'vinagre', 'mel', 'melaço', 'gorduras & óleos'
  ];
  if (ingredientKeywords.some(k => n.includes(k) || c.includes(k)) && !n.includes('bolo') && !n.includes('doce')) {
    return {
      group: 2,
      label: 'Ingrediente Culinário (Grupo 2)',
      shortLabel: 'Ingrediente Culinário',
      color: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      description: 'Usar em pequenas quantidades para temperar e cozinhar alimentos in natura.',
    };
  }

  // Grupo 3: Alimentos Processados (Limitar)
  const processedKeywords = [
    'queijo', 'conserva', 'em calda', 'defumado', 'pão francês', 'pão caseiro', 'geleia', 'extrato de tomate',
    'sardinha em óleo', 'atum em óleo', 'azeitona', 'palmito em conserva', 'ervilha em conserva'
  ];
  if (processedKeywords.some(k => n.includes(k))) {
    return {
      group: 3,
      label: 'Processado (Grupo 3)',
      shortLabel: 'Processado',
      color: '#f97316',
      badgeBg: 'rgba(249, 115, 22, 0.15)',
      description: 'Alimento in natura adicionado de sal, açúcar ou óleo. Limitar o consumo.',
    };
  }

  // Grupo 1: In natura ou Minimamente Processado (Base da alimentação)
  return {
    group: 1,
    label: 'In Natura / Minimamente Processado (Grupo 1)',
    shortLabel: 'In Natura',
    color: '#22c55e',
    badgeBg: 'rgba(34, 197, 94, 0.15)',
    description: 'Base da alimentação saudável recomendada pelo Guia Alimentar do Ministério da Saúde.',
  };
}


