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
export function evaluateCheckinDue(params?: CheckinParams | null): CheckinStatusResult {
  const safeParams = params || {};
  const now = safeParams.currentDate || new Date();
  const todayStr = (now instanceof Date && !isNaN(now.getTime()))
    ? now.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const freq = safeParams.frequencyDays === 14 || safeParams.frequencyDays === 30 ? safeParams.frequencyDays : 7;
  const prefDay = safeParams.preferredWeekday !== undefined ? safeParams.preferredWeekday : 1; // 1 = Segunda-feira

  // 1. Se o usuário pulou hoje ou nos últimos 2 dias, respeita o snooze
  if (safeParams.lastSkippedDate) {
    const diffSkipDays = getDaysBetween(safeParams.lastSkippedDate, todayStr);
    if (!isNaN(diffSkipDays) && diffSkipDays >= 0 && diffSkipDays < 3) {
      return {
        isDue: false,
        reason: 'skipped_recently',
        daysSinceLastCheckin: safeParams.lastCheckinDate ? getDaysBetween(safeParams.lastCheckinDate, todayStr) : null,
        nextDueDateFormatted: 'Adiado por alguns dias',
        badgeLabel: 'Adiado',
      };
    }
  }

  // 2. Se nunca realizou check-in
  if (!safeParams.lastCheckinDate) {
    return {
      isDue: true,
      reason: 'first_time',
      daysSinceLastCheckin: null,
      nextDueDateFormatted: 'Pendente (Primeiro registro)',
      badgeLabel: 'Check-in Inicial',
    };
  }

  const diffCheckinDays = getDaysBetween(safeParams.lastCheckinDate, todayStr);

  // Se a data for inválida, assume vencido com fallback gracioso
  if (isNaN(diffCheckinDays)) {
    return {
      isDue: true,
      reason: 'due',
      daysSinceLastCheckin: null,
      nextDueDateFormatted: 'Hoje',
      badgeLabel: 'Hora do Check-in',
    };
  }

  // 3. Se realizou recentemente dentro da frequência configurada
  if (diffCheckinDays < freq && diffCheckinDays >= 0) {
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
 * Retorna a diferença em dias corridos entre duas datas no formato YYYY-MM-DD ou ISO.
 */
export function getDaysBetween(dateStrA: string, dateStrB: string): number {
  if (!dateStrA || !dateStrB) return 0;
  const cleanA = String(dateStrA).split('T')[0].trim();
  const cleanB = String(dateStrB).split('T')[0].trim();
  const partsA = cleanA.split('-').map(Number);
  const partsB = cleanB.split('-').map(Number);

  if (partsA.length < 3 || partsB.length < 3 || partsA.some(isNaN) || partsB.some(isNaN)) {
    const tA = new Date(dateStrA).getTime();
    const tB = new Date(dateStrB).getTime();
    if (isNaN(tA) || isNaN(tB)) return 0;
    return Math.floor((tB - tA) / (1000 * 60 * 60 * 24));
  }

  const utcA = Date.UTC(partsA[0], partsA[1] - 1, partsA[2]);
  const utcB = Date.UTC(partsB[0], partsB[1] - 1, partsB[2]);
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
