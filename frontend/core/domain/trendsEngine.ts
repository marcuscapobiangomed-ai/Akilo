/**
 * trendsEngine.ts
 * Motor de análise de tendências de peso e composição corporal.
 * Focado em médias móveis (7 dias), amortecimento de ruído hídrico e testes de suficiência amostral.
 */

export interface WeightRecord {
  date: string; // YYYY-MM-DD
  weight_kg: number;
}

export interface TrendAnalysis {
  currentWeight: number | null;
  movingAverage7d: number | null;
  changeLastWeekKg: number | null;
  isSufficientData: boolean;
  sampleCount7d: number;
  trendDirection: 'losing' | 'maintaining' | 'gaining' | 'insufficient_data';
  weeklyRateKg: number | null;
  disclaimer: string;
}

/**
 * Calcula a média móvel de 7 dias e avalia a tendência real de peso.
 * Evita conclusões precipitadas com pesagens isoladas.
 */
export function analyzeWeightTrend(
  records: WeightRecord[],
  referenceDate: Date = new Date()
): TrendAnalysis {
  if (!records || records.length === 0) {
    return {
      currentWeight: null,
      movingAverage7d: null,
      changeLastWeekKg: null,
      isSufficientData: false,
      sampleCount7d: 0,
      trendDirection: 'insufficient_data',
      weeklyRateKg: null,
      disclaimer: 'Nenhum registro de pesagem encontrado.',
    };
  }

  // Ordena por data decrescente
  const sorted = [...records].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const latestWeight = sorted[0].weight_kg;

  // Filtra registros dos últimos 7 dias a partir da data de referência
  const refTime = referenceDate.getTime();
  const sevenDaysAgo = refTime - 7 * 24 * 60 * 60 * 1000;
  const fourteenDaysAgo = refTime - 14 * 24 * 60 * 60 * 1000;

  const currentWindowRecords = sorted.filter((r) => {
    const t = new Date(r.date).getTime();
    return t >= sevenDaysAgo && t <= refTime;
  });

  const previousWindowRecords = sorted.filter((r) => {
    const t = new Date(r.date).getTime();
    return t >= fourteenDaysAgo && t < sevenDaysAgo;
  });

  const sampleCount = currentWindowRecords.length;
  // Requisito clínico: mínimo de 3 pesagens na semana para calcular média representativa
  const isSufficientData = sampleCount >= 3;

  if (!isSufficientData) {
    return {
      currentWeight: latestWeight,
      movingAverage7d: null,
      changeLastWeekKg: null,
      isSufficientData: false,
      sampleCount7d: sampleCount,
      trendDirection: 'insufficient_data',
      weeklyRateKg: null,
      disclaimer: `Você registrou ${sampleCount} pesagem(ns) nos últimos 7 dias. São necessários pelo menos 3 registros na semana para calcular uma média móvel representativa e amortecer flutuações de água.`,
    };
  }

  // Média móvel simples da semana atual
  const sumCurrent = currentWindowRecords.reduce((acc, r) => acc + r.weight_kg, 0);
  const currentMA = Math.round((sumCurrent / sampleCount) * 100) / 100;

  // Comparação com a semana anterior se houver dados suficientes
  let changeLastWeekKg: number | null = null;
  let weeklyRateKg: number | null = null;
  let trendDirection: 'losing' | 'maintaining' | 'gaining' | 'insufficient_data' = 'maintaining';

  if (previousWindowRecords.length >= 2) {
    const sumPrev = previousWindowRecords.reduce((acc, r) => acc + r.weight_kg, 0);
    const prevMA = sumPrev / previousWindowRecords.length;
    changeLastWeekKg = Math.round((currentMA - prevMA) * 10) / 10;
    weeklyRateKg = changeLastWeekKg;

    if (changeLastWeekKg <= -0.2) {
      trendDirection = 'losing';
    } else if (changeLastWeekKg >= 0.2) {
      trendDirection = 'gaining';
    } else {
      trendDirection = 'maintaining';
    }
  }

  return {
    currentWeight: latestWeight,
    movingAverage7d: currentMA,
    changeLastWeekKg,
    isSufficientData: true,
    sampleCount7d: sampleCount,
    trendDirection,
    weeklyRateKg,
    disclaimer:
      'Tendência calculada por média móvel de 7 dias. Flutuações diárias isoladas refletem principalmente hidratação, glicogênio e trânsito intestinal.',
  };
}

/**
 * Detecta se uma oscilação diária brusca é compatível com retenção hídrica/sódio
 * (Para ganhar 1kg de gordura real em 24h seriam necessários ~7.700 kcal de superávit).
 */
export function explainDailyFluctuation(
  todayWeight: number,
  yesterdayWeight: number
): string | null {
  const diff = todayWeight - yesterdayWeight;
  if (diff >= 0.8) {
    return `Seu peso subiu ${diff.toFixed(1)} kg desde ontem. Variações rápidas como esta decorrem de retenção de líquidos, ingestão recente de sódio ou carboidratos, não de ganho de gordura.`;
  } else if (diff <= -0.8) {
    return `Seu peso reduziu ${Math.abs(diff).toFixed(1)} kg desde ontem. Quedas expressivas em 24h refletem principalmente liberação de líquidos corporais. Mantenha a hidratação constante.`;
  }
  return null;
}
