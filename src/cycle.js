// Расчёт цикла. Прогноз приблизительный: считаем по дате начала последних месячных и длине цикла.
import { diffDays } from './util.js';

export function cycleDay(cycle, date) {
  if (!cycle || !cycle.last) return null;
  const n = diffDays(cycle.last, date);
  const L = cycle.len;
  return ((n % L) + L) % L + 1;
}

export function ovulationDay(cycle) {
  return cycle.len - 14;
}

export function phaseOf(cycle, n) {
  const ov = ovulationDay(cycle);
  if (n <= cycle.period) return 'menses';
  if (n < ov - 4) return 'follicular';
  if (n <= ov + 1) return 'fertile';
  return 'luteal';
}

export const PHASE = {
  menses: { name: 'Месячные', hint: 'Можно сбавить темп. Тепло, вода и отдых обычно помогают.' },
  follicular: { name: 'Фолликулярная фаза', hint: 'Обычно больше энергии. Хорошее время для новых дел и тренировок.' },
  fertile: { name: 'Овуляция и плодородные дни', hint: 'Энергии обычно достаточно. Это плодородные дни.' },
  luteal: { name: 'Лютеиновая фаза', hint: 'Энергия может снижаться. Важны сон и мягкая нагрузка.' }
};

// Сколько дней до следующих месячных
export function daysToNextPeriod(cycle, date) {
  const n = cycleDay(cycle, date);
  if (!n) return null;
  return cycle.len - n + 1;
}
