/**
 * insightsEngine.ts
 * Motor de insights inteligentes determinísticos e explicáveis (Custo R$ 0, sem API de IA).
 * Toda recomendação é acompanhada da justificativa factual dos dados registrados.
 */

export interface Insight {
  id: string;
  category: 'nutrition' | 'activity' | 'trends' | 'habits';
  type: 'positive' | 'warning' | 'tip';
  title: string;
  message: string;
  explanation: string;
  actionableTip: string;
}

export interface UserContext {
  daysLoggedPast7d: number;
  totalWorkoutsPast7d: number;
  weeklyWorkoutsTarget: number;
  avgCaloriesPast7d: number;
  targetCalories: number;
  avgProteinPast7d: number;
  targetProtein: number;
  avgFiberPast7d: number;
  avgWaterPast7d: number;
  targetWater: number;
  weightTrendKg: number | null; // ex: -0.4 ou +0.2
  sampleWeightCount7d: number;
}

/**
 * Gera a lista de insights priorizados para o usuário a partir dos seus registros reais.
 */
export function generateSmartInsights(ctx?: UserContext | null): Insight[] {
  const insights: Insight[] = [];
  if (!ctx) return insights;

  // 1. CONSISTÊNCIA DE REGISTRO
  if (ctx.daysLoggedPast7d >= 5) {
    insights.push({
      id: 'consistency_high',
      category: 'habits',
      type: 'positive',
      title: 'Alta Consistência no Diário',
      message: `Você registrou suas refeições em ${ctx.daysLoggedPast7d} dos últimos 7 dias.`,
      explanation:
        'A literatura científica aponta o monitoramento consistente como o principal fator preditor de sucesso no emagrecimento a longo prazo.',
      actionableTip: 'Continue mantendo o hábito mesmo nos finais de semana para consolidar a rotina.',
    });
  } else if (ctx.daysLoggedPast7d >= 1 && ctx.daysLoggedPast7d <= 3) {
    insights.push({
      id: 'consistency_low',
      category: 'habits',
      type: 'tip',
      title: 'Aumente a Frequência de Registros',
      message: `Refeições registradas em apenas ${ctx.daysLoggedPast7d} dias nesta semana.`,
      explanation:
        'Lacunas de registro dificultam estimar o balanço calórico real e enfraquecem os insights do aplicativo.',
      actionableTip:
        'Use o botão "Repetir Refeição" ou salve combos frequentes para registrar em menos de 10 segundos.',
    });
  }

  // 2. ADEQUAÇÃO PROTEICA
  if (ctx.daysLoggedPast7d >= 3 && ctx.targetProtein > 0) {
    const proteinRatio = ctx.avgProteinPast7d / ctx.targetProtein;
    if (proteinRatio >= 0.85) {
      insights.push({
        id: 'protein_on_target',
        category: 'nutrition',
        type: 'positive',
        title: 'Meta de Proteína Cumprida',
        message: `Média de ${Math.round(ctx.avgProteinPast7d)}g de proteína/dia (${Math.round(proteinRatio * 100)}% da meta).`,
        explanation:
          'A ingestão proteica adequada maximiza a preservação de massa muscular durante o déficit calórico e reduz a fome entre refeições.',
        actionableTip: 'Mantenha a distribuição de proteínas fracionada ao longo do dia.',
      });
    } else if (proteinRatio < 0.7) {
      insights.push({
        id: 'protein_deficit',
        category: 'nutrition',
        type: 'warning',
        title: 'Ingestão de Proteína Abaixo da Meta',
        message: `Média de ${Math.round(ctx.avgProteinPast7d)}g/dia contra ${ctx.targetProtein}g planejadas.`,
        explanation:
          'Proteína insuficiente em fases de emagrecimento pode acelerar a perda de massa magra e aumentar a compulsão.',
        actionableTip:
          'Tente incluir ovos, iogurtes, queijos magros, atum ou frango nos seus lanches intermediários.',
      });
    }
  }

  // 3. FIBRAS ALIMENTARES
  if (ctx.daysLoggedPast7d >= 3 && ctx.avgCaloriesPast7d > 0) {
    const fiberDensity = (ctx.avgFiberPast7d / ctx.avgCaloriesPast7d) * 1000;
    if (fiberDensity < 10) {
      insights.push({
        id: 'fiber_low',
        category: 'nutrition',
        type: 'tip',
        title: 'Aumente as Fibras no Prato',
        message: `Média de ${Math.round(ctx.avgFiberPast7d)}g de fibras/dia (${Math.round(fiberDensity)}g por 1000 kcal).`,
        explanation:
          'A OMS recomenda pelo menos 14g de fibras a cada 1000 kcal para regular a absorção glicêmica e o trânsito intestinal.',
        actionableTip:
          'Inclua aveia no café da manhã e uma porção de folhas verdes ou leguminosas (feijão, lentilha) no almoço.',
      });
    }
  }

  // 4. ATIVIDADE FÍSICA & META ADAPTATIVA
  if (ctx.totalWorkoutsPast7d >= ctx.weeklyWorkoutsTarget && ctx.weeklyWorkoutsTarget > 0) {
    insights.push({
      id: 'workouts_achieved',
      category: 'activity',
      type: 'positive',
      title: 'Meta de Treinos Superada',
      message: `Você completou ${ctx.totalWorkoutsPast7d} de ${ctx.weeklyWorkoutsTarget} treinos programados nesta semana!`,
      explanation:
        'A consistência na atividade física melhora a sensibilidade à insulina e aumenta o gasto energético semanal.',
      actionableTip: 'Não se esqueça de reservar pelo menos um dia para descanso e recuperação.',
    });
  } else if (ctx.weeklyWorkoutsTarget >= 4 && ctx.totalWorkoutsPast7d <= 1) {
    // Proposta adaptativa inteligente
    insights.push({
      id: 'workouts_adaptive_suggestion',
      category: 'activity',
      type: 'tip',
      title: 'Sugestão de Meta Adaptativa',
      message: `Você realizou ${ctx.totalWorkoutsPast7d} treino nesta semana, contra uma meta de ${ctx.weeklyWorkoutsTarget}.`,
      explanation:
        'Metas ambiciosas demais em semanas corridas geram frustração. É melhor consolidar 2 a 3 treinos com consistência do que falhar tentando 5.',
      actionableTip:
        'Que tal ajustar temporariamente sua meta para 3 treinos semanais no seu Perfil para fechar a semana com vitória?',
    });
  }

  // 5. HIDRATAÇÃO
  if (ctx.targetWater > 0 && ctx.avgWaterPast7d > 0) {
    const waterRatio = ctx.avgWaterPast7d / ctx.targetWater;
    if (waterRatio < 0.7) {
      insights.push({
        id: 'water_low',
        category: 'habits',
        type: 'warning',
        title: 'Atenção à Hidratação',
        message: `Média de ${Math.round(ctx.avgWaterPast7d)} ml de água/dia (${Math.round(waterRatio * 100)}% da meta).`,
        explanation:
          'A desidratação leve muitas vezes é confundida com sensação de fome e pode reduzir o rendimento físico.',
        actionableTip:
          'Deixe uma garrafinha visível na mesa de trabalho e registre o consumo após cada pausa.',
      });
    }
  }

  // 6. TENDÊNCIA DE PESO
  if (ctx.sampleWeightCount7d >= 3 && ctx.weightTrendKg !== null) {
    if (ctx.weightTrendKg <= -0.2 && ctx.weightTrendKg >= -0.8) {
      insights.push({
        id: 'weight_trend_steady',
        category: 'trends',
        type: 'positive',
        title: 'Ritmo Saudável de Perda',
        message: `Sua média móvel reduziu ${Math.abs(ctx.weightTrendKg)} kg nesta semana.`,
        explanation:
          'Uma redução semanal entre 0,3% e 0,8% do peso corporal indica perda quase exclusiva de gordura, preservando a musculatura.',
        actionableTip: 'Mantenha exatamente a estratégia atual sem cortes drásticos.',
      });
    } else if (ctx.weightTrendKg < -1.0) {
      insights.push({
        id: 'weight_trend_too_fast',
        category: 'trends',
        type: 'warning',
        title: 'Queda Rápida de Peso',
        message: `Sua média móvel reduziu ${Math.abs(ctx.weightTrendKg)} kg em 7 dias.`,
        explanation:
          'Perdas muito rápidas no início contêm grande proporção de água e glicogênio. Evite déficits calóricos extremos para não desacelerar seu metabolismo.',
        actionableTip: 'Certifique-se de não estar consumindo calorias abaixo da sua Taxa Metabólica Basal.',
      });
    }
  }

  return insights;
}
