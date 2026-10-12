/**
 * nutritionEngine.ts
 * Motor determinístico de cálculos nutricionais (100% desacoplado de APIs externas).
 * Normalização por 100g/100ml, conversão de porções e métricas de qualidade.
 */

export interface NutrientBase {
  base_qty: number; // Geralmente 100g ou 100ml
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
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
  fiber_g: number;
  sodium_mg: number;
  hasIncompleteData: boolean;
  macroPercentages: {
    protein: number;
    carbs: number;
    fats: number;
  };
}

/**
 * Calcula os nutrientes com base na porção consumida pelo usuário.
 * Exemplo: 20g de proteína por 100g, consumido em 150g -> 30g de proteína.
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
  
  // Tratamento de dados nulos/ausentes da TBCA/OFF
  const hasIncompleteData = base.fiber_g === null || base.fiber_g === undefined;
  const fiber_g = base.fiber_g != null ? Math.round(Math.max(0, base.fiber_g) * ratio * 10) / 10 : 0;
  const sodium_mg = base.sodium_mg != null ? Math.round(Math.max(0, base.sodium_mg) * ratio * 10) / 10 : 0;

  // Cálculo da distribuição percentual de calorias por macronutriente (4-4-9 kcal/g)
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

  return {
    qty,
    unit,
    calories,
    protein_g,
    carbs_g,
    fats_g,
    fiber_g,
    sodium_mg,
    hasIncompleteData,
    macroPercentages,
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
