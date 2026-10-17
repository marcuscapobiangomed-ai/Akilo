/**
 * checkinEngine.ts
 * Motor de controle e agendamento inteligente do Check-in Periódico de Bioimpedância & Peso.
 * Suporta frequência configurável (Semanal = 7d, Quinzenal = 14d, Mensal = 30d),
 * dia da semana preferido e adiamento/snooze ("pular esta verificação").
 */

export interface CheckinParams {
  lastCheckinDate?: string | null;
  lastSkippedDate?: string | null;
  frequencyDays?: number; // 7, 14 ou 30
  preferredWeekday?: number; // 0 = Domingo, 1 = Segunda, etc.
  currentDate?: Date;
}

export interface CheckinStatusResult {
  isDue: boolean;
  reason: 'due' | 'already_done' | 'skipped_recently' | 'first_time';
  daysSinceLastCheckin: number | null;
  nextDueDateFormatted: string;
  badgeLabel: string;
}

/**
 * Avalia se o usuário deve receber o aviso para atualizar suas medidas de bioimpedância.
 */
export function evaluateCheckinDue(params: CheckinParams): CheckinStatusResult {
  const now = params.currentDate || new Date();
  const todayStr = now.toISOString().split('T')[0];
  const freq = params.frequencyDays === 14 || params.frequencyDays === 30 ? params.frequencyDays : 7;
  const prefDay = params.preferredWeekday !== undefined ? params.preferredWeekday : 1; // 1 = Segunda-feira

  // 1. Se o usuário pulou hoje ou nos últimos 2 dias, respeita o snooze
  if (params.lastSkippedDate) {
    const diffSkipDays = getDaysBetween(params.lastSkippedDate, todayStr);
    if (diffSkipDays >= 0 && diffSkipDays < 3) {
      return {
        isDue: false,
        reason: 'skipped_recently',
        daysSinceLastCheckin: params.lastCheckinDate ? getDaysBetween(params.lastCheckinDate, todayStr) : null,
        nextDueDateFormatted: 'Adiado por alguns dias',
        badgeLabel: 'Adiado',
      };
    }
  }

  // 2. Se nunca realizou check-in
  if (!params.lastCheckinDate) {
    return {
      isDue: true,
      reason: 'first_time',
      daysSinceLastCheckin: null,
      nextDueDateFormatted: 'Pendente (Primeiro registro)',
      badgeLabel: 'Check-in Inicial',
    };
  }

  const diffCheckinDays = getDaysBetween(params.lastCheckinDate, todayStr);

  // 3. Se realizou recentemente dentro da frequência configurada
  if (diffCheckinDays < freq) {
    const remainingDays = freq - diffCheckinDays;
    return {
      isDue: false,
      reason: 'already_done',
      daysSinceLastCheckin: diffCheckinDays,
      nextDueDateFormatted: `Em ${remainingDays} dia(s)`,
      badgeLabel: 'Em dia',
    };
  }

  // 4. Vencido: passaram-se `freq` dias ou mais
  return {
    isDue: true,
    reason: 'due',
    daysSinceLastCheckin: diffCheckinDays,
    nextDueDateFormatted: 'Hoje',
    badgeLabel: 'Hora do Check-in',
  };
}

/**
 * Retorna a diferença em dias corridos entre duas datas no formato YYYY-MM-DD.
 */
export function getDaysBetween(dateStrA: string, dateStrB: string): number {
  const [y1, m1, d1] = dateStrA.split('-').map(Number);
  const [y2, m2, d2] = dateStrB.split('-').map(Number);
  const utcA = Date.UTC(y1, m1 - 1, d1);
  const utcB = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((utcB - utcA) / (1000 * 60 * 60 * 24));
}

/**
 * Formata o label de frequência configurada.
 */
export function getFrequencyLabel(days: number): string {
  switch (days) {
    case 14:
      return 'Quinzenal (a cada 14 dias)';
    case 30:
      return 'Mensal (a cada 30 dias)';
    case 7:
    default:
      return 'Semanal (a cada 7 dias - Recomendado)';
  }
}
