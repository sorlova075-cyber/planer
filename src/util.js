// Вспомогательные функции: даты, форматирование, идентификаторы.

export const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const today = () => ymd(new Date());
export const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s, n) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
// Сколько дней от a до b (b - a)
export const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
export const fmt = (n) => Math.round(n).toLocaleString('ru-RU');

export const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
export const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const WD = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const longDate = (s) => {
  const d = parse(s);
  return d.getDate() + ' ' + MONTHS_GEN[d.getMonth()];
};
export const weekdayDate = (s) => {
  const d = parse(s);
  return cap(d.toLocaleDateString('ru-RU', { weekday: 'long' })) + ', ' + longDate(s);
};

// Ближайший день рождения (по строке YYYY-MM-DD, год рождения не важен)
export function nextBirthday(bday, from = today()) {
  const [, m, d] = bday.split('-').map(Number);
  const y = parse(from).getFullYear();
  let c = ymd(new Date(y, m - 1, d));
  if (diffDays(from, c) < 0) c = ymd(new Date(y + 1, m - 1, d));
  return { date: c, days: diffDays(from, c) };
}

export function daysWord(n) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return 'дней';
  if (b === 1) return 'день';
  if (b >= 2 && b <= 4) return 'дня';
  return 'дней';
}

export function inDays(n) {
  if (n === 0) return 'сегодня';
  if (n === 1) return 'завтра';
  return 'через ' + n + ' ' + daysWord(n);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}
