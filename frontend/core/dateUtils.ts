/**
 * dateUtils.ts
 * Utilitários Canônicos de Data Local para o Akilo.
 * 
 * Evita o bug crítico de Timezone (UTC-3 no Brasil), onde após as 21:00h
 * o método new Date().toISOString() avança para o dia de amanhã, causando
 * desaparecimento temporário de alimentos e descompasso no diário alimentar.
 */

/**
 * Retorna a data no fuso horário local do dispositivo no formato 'YYYY-MM-DD'.
 */
export function getLocalDateString(dateInput?: Date | string | number | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    const y = fallback.getFullYear();
    const m = String(fallback.getMonth() + 1).padStart(2, '0');
    const day = String(fallback.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Formata uma data 'YYYY-MM-DD' para exibição amigável em português (ex: "Hoje", "Ontem" ou "Segunda, 20 out").
 */
export function formatFriendlyDate(dateStr: string): string {
  if (!dateStr) return '';
  const todayStr = getLocalDateString();
  if (dateStr === todayStr) return 'Hoje';

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);
  if (dateStr === yesterdayStr) return 'Ontem';

  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
