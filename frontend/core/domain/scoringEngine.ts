/**
 * scoringEngine.ts
 * Motor de pontuação e ranking baseado exclusivamente em hábitos saudáveis.
 * Espelha a view PostgreSQL `view_weekly_habit_leaderboard` para feedback instantâneo na UI.
 * REGRA DE OURO: ZERO pontos para perda de peso ou restrição calórica agressiva.
 */

export interface DayHabitSummary {
  date: string; // YYYY-MM-DD
  distinctMealsCount: number; // ex: 2 (almoço e jantar)
  exerciseMinutes: number; // ex: 45
  waterLoggedMl: number;
  waterTargetMl: number;
}

export interface WeeklyScoreBreakdown {
  foodDays: number;
  foodPoints: number; // 10 pts por dia com >= 2 refeições
  exerciseDays: number;
  exercisePoints: number; // 10 pts por dia com >= 20 min de treino
  waterDays: number;
  waterPoints: number; // 5 pts por dia com >= 80% da meta de água
  streakBonus: number; // 20 pts se atingiu 5+ dias de consistência
  totalPoints: number;
}

/**
 * Calcula a pontuação semanal de hábitos saudáveis de um usuário.
 */
export function calculateWeeklyHabitScore(
  days: DayHabitSummary[]
): WeeklyScoreBreakdown {
  let foodDays = 0;
  let exerciseDays = 0;
  let waterDays = 0;

  for (const day of days) {
    if (day.distinctMealsCount >= 2) {
      foodDays++;
    }
    if (day.exerciseMinutes >= 20) {
      exerciseDays++;
    }
    const targetWater = day.waterTargetMl > 0 ? day.waterTargetMl : 2500;
    if (day.waterLoggedMl >= targetWater * 0.8) {
      waterDays++;
    }
  }

  const foodPoints = foodDays * 10;
  const exercisePoints = exerciseDays * 10;
  const waterPoints = waterDays * 5;

  // Bônus de consistência: atingiu ao menos 5 dias ativos em alimentação ou treino
  const streakBonus = foodDays >= 5 || exerciseDays >= 5 ? 20 : 0;
  const totalPoints = foodPoints + exercisePoints + waterPoints + streakBonus;

  return {
    foodDays,
    foodPoints,
    exerciseDays,
    exercisePoints,
    waterDays,
    waterPoints,
    streakBonus,
    totalPoints,
  };
}
