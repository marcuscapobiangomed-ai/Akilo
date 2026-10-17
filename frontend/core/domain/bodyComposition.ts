/**
 * bodyComposition.ts
 * Motor de cálculos biométricos e bioimpedância corporal.
 * Focado em integridade científica alinhada às Diretrizes Brasileiras:
 * - ABESO (Associação Brasileira para o Estudo da Obesidade)
 * - Ministério da Saúde / SISVAN & Lipschitz (Critério Antropométrico para Idosos 60+)
 * - SBMEE / ACSM (Composição Corporal e Gordura por Sexo Biológico)
 * - Mifflin-St Jeor por Sexo Biológico e Katch-McArdle por Massa Magra
 */

export type BiologicalSex = 'male' | 'female';

export type BMICategory =
  | 'underweight'
  | 'normal'
  | 'overweight'
  | 'obesity_1'
  | 'obesity_2'
  | 'obesity_3'
  | 'elderly_underweight'
  | 'elderly_normal'
  | 'elderly_overweight';

export interface BMIEvaluation {
  bmi: number;
  label: string;
  category: BMICategory;
  color: string;
  isElderly: boolean;
  standard: 'OMS / ABESO 2022' | 'Lipschitz / SISVAN Ministério da Saúde';
  details?: string;
}

export interface MetabolicAgeEvaluation {
  difference: number; // metabolicAge - chronologicalAge
  label: string;
  color: string;
}

/**
 * Calcula o Peso Ideal pela faixa de eutrofia máxima saudável (IMC 24.9).
 */
export function calculateIdealWeight(heightCm: number): number {
  if (!heightCm || heightCm <= 0) return 70;
  const heightM = heightCm / 100;
  return Math.round(24.9 * heightM * heightM * 10) / 10;
}

/**
 * Calcula o Peso Ajustado para pacientes com obesidade (IMC >= 30).
 * Padrão-ouro da ABESO e nutrição clínica hospitalar para evitar superestimativa calórica e proteica.
 * Peso Ajustado = Peso Ideal + 0.25 * (Peso Atual - Peso Ideal)
 */
export function calculateAdjustedWeight(weightKg: number, heightCm: number): number {
  if (!weightKg || !heightCm) return weightKg || 70;
  const ideal = calculateIdealWeight(heightCm);
  if (weightKg <= ideal) return weightKg;
  return Math.round((ideal + 0.25 * (weightKg - ideal)) * 10) / 10;
}

/**
 * Calcula o IMC (kg/m²) aplicando a estratificação etária oficial:
 * 1. Para idosos (idade >= 60 anos): Critério de Lipschitz / SISVAN Ministério da Saúde
 *    - < 22.0: Baixo peso (Risco de desnutrição/sarcopenia)
 *    - 22.0 a 27.0: Adequado (Eutrofia)
 *    - > 27.0: Sobrepeso
 * 2. Para adultos (< 60 anos): Critério ABESO 2022 / OMS
 *    - < 18.5: Abaixo do peso
 *    - 18.5 a 24.9: Peso Saudável (Eutrofia)
 *    - 25.0 a 29.9: Sobrepeso
 *    - 30.0 a 34.9: Obesidade Grau I
 *    - 35.0 a 39.9: Obesidade Grau II (Severa)
 *    - >= 40.0: Obesidade Grau III (Mórbida)
 */
export function calculateBMI(
  weightKg: number,
  heightCm: number,
  age?: number | null
): BMIEvaluation | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const bmiRaw = weightKg / (heightM * heightM);
  const bmi = Math.round(bmiRaw * 10) / 10;
  const isElderly = Boolean(age && age >= 60);

  // Critério de Lipschitz / Ministério da Saúde / SBGG para Idosos (>= 60 anos)
  if (isElderly) {
    if (bmi < 22.0) {
      return {
        bmi,
        label: 'Baixo Peso (Risco de Desnutrição)',
        category: 'elderly_underweight',
        color: '#38bdf8',
        isElderly: true,
        standard: 'Lipschitz / SISVAN Ministério da Saúde',
        details: 'Em idosos, faixas inferiores a 22 kg/m² associam-se a sarcopenia e perda de reserva funcional.',
      };
    }
    if (bmi <= 27.0) {
      return {
        bmi,
        label: 'Peso Adequado (Eutrofia)',
        category: 'elderly_normal',
        color: '#22c55e',
        isElderly: true,
        standard: 'Lipschitz / SISVAN Ministério da Saúde',
        details: 'Faixa protetora recomendada pelo Ministério da Saúde e SBGG para pessoas idosas.',
      };
    }
    return {
      bmi,
      label: 'Sobrepeso',
      category: 'elderly_overweight',
      color: '#f59e0b',
      isElderly: true,
      standard: 'Lipschitz / SISVAN Ministério da Saúde',
      details: 'Sobrepeso segundo critério gerontológico nacional.',
    };
  }

  // Critério ABESO 2022 / OMS para Adultos (< 60 anos)
  if (bmi < 18.5) {
    return {
      bmi,
      label: 'Abaixo do peso',
      category: 'underweight',
      color: '#38bdf8',
      isElderly: false,
      standard: 'OMS / ABESO 2022',
    };
  }
  if (bmi < 25.0) {
    return {
      bmi,
      label: 'Peso Saudável',
      category: 'normal',
      color: '#22c55e',
      isElderly: false,
      standard: 'OMS / ABESO 2022',
    };
  }
  if (bmi < 30.0) {
    return {
      bmi,
      label: 'Sobrepeso',
      category: 'overweight',
      color: '#f59e0b',
      isElderly: false,
      standard: 'OMS / ABESO 2022',
    };
  }
  if (bmi < 35.0) {
    return {
      bmi,
      label: 'Obesidade Grau I',
      category: 'obesity_1',
      color: '#f97316',
      isElderly: false,
      standard: 'OMS / ABESO 2022',
      details: 'Recomenda-se acompanhamento multiprofissional para reeducação alimentar.',
    };
  }
  if (bmi < 40.0) {
    return {
      bmi,
      label: 'Obesidade Grau II (Severa)',
      category: 'obesity_2',
      color: '#ef4444',
      isElderly: false,
      standard: 'OMS / ABESO 2022',
      details: 'Acompanhamento médico e nutricional essencial para controle metabólico.',
    };
  }
  return {
    bmi,
    label: 'Obesidade Grau III (Mórbida)',
    category: 'obesity_3',
    color: '#b91c1c',
    isElderly: false,
    standard: 'OMS / ABESO 2022',
    details: 'Risco clínico aumentado de comorbidades cardiovasculares e metabólicas.',
  };
}

/**
 * Estima a Taxa Metabólica Basal (TMB / BMR) pela fórmula científica Mifflin-St Jeor
 * com distinção fisiológica obrigatória por sexo biológico:
 * - Homens: 10 * peso + 6.25 * altura - 5 * idade + 5
 * - Mulheres: 10 * peso + 6.25 * altura - 5 * idade - 161
 */
export function estimateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: BiologicalSex = 'male'
): number {
  if (!weightKg || !heightCm || !age) return 2000;
  const sexConstant = sex === 'female' ? -161 : 5;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant;
  return Math.round(bmr);
}

/**
 * Estima o Metabolismo Basal pela fórmula de Katch-McArdle (baseada em Massa Magra).
 * Aplicável quando o usuário possui aferição por balança de bioimpedância.
 * BMR = 370 + (21.6 * Massa Magra em kg)
 */
export function estimateBMRKatchMcArdle(leanMassKg: number): number {
  if (!leanMassKg || leanMassKg <= 0) return 2000;
  return Math.round(370 + 21.6 * leanMassKg);
}

/**
 * Avalia o diferencial entre a idade metabólica da bioimpedância e a idade real cronológica.
 */
export function evaluateMetabolicAge(
  chronologicalAge: number,
  metabolicAge?: number | null
): MetabolicAgeEvaluation | null {
  if (!chronologicalAge || !metabolicAge || metabolicAge <= 0) return null;
  const diff = metabolicAge - chronologicalAge;

  if (diff < 0) {
    return {
      difference: diff,
      label: `${Math.abs(diff)} anos mais jovem`,
      color: '#22c55e',
    };
  }
  if (diff === 0) {
    return {
      difference: 0,
      label: 'Idade cronológica exata',
      color: '#38bdf8',
    };
  }
  return {
    difference: diff,
    label: `+${diff} anos em relação à idade real`,
    color: '#f59e0b',
  };
}

/**
 * Classifica o percentual de gordura corporal por sexo biológico (SBMEE / ACSM):
 * Homens:
 *   < 6%: Essencial / Muito Baixo
 *   6-13%: Atlético
 *   14-17%: Fitness / Bom
 *   18-24%: Aceitável / Médio
 *   > 24%: Elevado (Obesidade)
 * Mulheres:
 *   < 14%: Essencial / Alerta Clínico (risco para tríade da mulher atleta)
 *   14-20%: Atlético
 *   21-24%: Fitness / Bom
 *   25-31%: Aceitável / Médio
 *   > 31%: Elevado (Obesidade)
 */
export function evaluateBodyFat(
  fatPct?: number | null,
  sex: BiologicalSex = 'male'
): { label: string; color: string; status: 'essential' | 'athletic' | 'fitness' | 'acceptable' | 'high' } | null {
  if (!fatPct || fatPct <= 0) return null;

  if (sex === 'female') {
    if (fatPct < 14) {
      return {
        label: 'Muito Baixo (Alerta Clínico)',
        color: '#38bdf8',
        status: 'essential',
      };
    }
    if (fatPct <= 20) {
      return {
        label: 'Atlético',
        color: '#22c55e',
        status: 'athletic',
      };
    }
    if (fatPct <= 24) {
      return {
        label: 'Fitness / Ideal',
        color: '#22c55e',
        status: 'fitness',
      };
    }
    if (fatPct <= 31) {
      return {
        label: 'Aceitável / Moderado',
        color: '#f59e0b',
        status: 'acceptable',
      };
    }
    return {
      label: 'Elevado',
      color: '#ef4444',
      status: 'high',
    };
  }

  // Homens
  if (fatPct < 6) {
    return {
      label: 'Essencial / Muito Baixo',
      color: '#38bdf8',
      status: 'essential',
    };
  }
  if (fatPct <= 13) {
    return {
      label: 'Atlético',
      color: '#22c55e',
      status: 'athletic',
    };
  }
  if (fatPct <= 17) {
    return {
      label: 'Fitness / Ideal',
      color: '#22c55e',
      status: 'fitness',
    };
  }
  if (fatPct <= 24) {
    return {
      label: 'Aceitável / Moderado',
      color: '#f59e0b',
      status: 'acceptable',
    };
  }
  return {
    label: 'Elevado',
    color: '#ef4444',
    status: 'high',
  };
}
