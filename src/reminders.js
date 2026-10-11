// Описание напоминания и проверка, нужно ли оно сегодня.
import { parse, longDate, WD } from './util.js';

export function describe(r) {
  if (!r.time) return r.s || '';
  if (r.repeat === 'daily') return 'каждый день, ' + r.time;
  if (r.repeat === 'weekly') return (r.days || []).slice().sort((a, b) => a - b).map((i) => WD[i]).join(', ') + ', ' + r.time;
  if (r.repeat === 'monthly') return parse(r.date).getDate() + ' числа каждого месяца, ' + r.time;
  return longDate(r.date) + ', ' + r.time;
}

export function dueToday(r, t) {
  if (!r.on || !r.time) return false;
  const date = r.date || t;
  if (r.repeat === 'none') return date === t;
  if (date > t) return false;
  if (r.repeat === 'daily') return true;
  if (r.repeat === 'weekly') return (r.days || []).includes((parse(t).getDay() + 6) % 7);
  if (r.repeat === 'monthly') return parse(date).getDate() === parse(t).getDate();
  return false;
}
