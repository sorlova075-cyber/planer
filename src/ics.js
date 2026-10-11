// Создание файла календаря (.ics): напоминание добавляется в календарь телефона и срабатывает само.
import { today, parse } from './util.js';

const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const enc = new TextEncoder();

// Длинные строки по правилам формата переносятся (не более 75 байт в строке)
function fold(line) {
  if (enc.encode(line).length <= 74) return line;
  const out = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > (out.length ? 73 : 74)) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const local = (d) => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function eventLines(r) {
  const [hh, mm] = (r.time || '09:00').split(':').map(Number);
  const d = parse(r.date || today());
  d.setHours(hh, mm, 0, 0);
  // Для повтора по дням недели первое событие ставим на ближайший выбранный день
  if (r.repeat === 'weekly' && r.days && r.days.length) {
    for (let i = 0; i < 7 && !r.days.includes((d.getDay() + 6) % 7); i++) d.setDate(d.getDate() + 1);
  }
  const end = new Date(d.getTime() + 15 * 60000);
  const L = ['BEGIN:VEVENT', 'UID:' + r.id + '@planer', 'DTSTAMP:' + stamp() + 'Z', 'DTSTART:' + local(d), 'DTEND:' + local(end), 'SUMMARY:' + esc(r.t)];
  if (r.repeat === 'daily') L.push('RRULE:FREQ=DAILY');
  else if (r.repeat === 'weekly') {
    const days = (r.days && r.days.length ? r.days : [(d.getDay() + 6) % 7]).slice().sort((a, b) => a - b).map((i) => BYDAY[i]).join(',');
    L.push('RRULE:FREQ=WEEKLY;BYDAY=' + days);
  } else if (r.repeat === 'monthly') L.push('RRULE:FREQ=MONTHLY');
  const a = Number(r.alarm) || 0;
  const trigger = a === 0 ? 'PT0S' : a % 1440 === 0 ? '-P' + a / 1440 + 'D' : a % 60 === 0 ? '-PT' + a / 60 + 'H' : '-PT' + a + 'M';
  L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(r.t), 'TRIGGER:' + trigger, 'END:VALARM', 'END:VEVENT');
  return L;
}

export function makeIcs(list) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Planer//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...list.flatMap(eventLines), 'END:VCALENDAR'];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(text, name = 'napominanie') {
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name + '.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function sendToCalendar(list, toast) {
  try {
    downloadIcs(makeIcs(list), list.length === 1 ? 'napominanie' : 'napominaniya');
    toast('Откройте скачанный файл и добавьте его в календарь');
  } catch (e) {
    toast('Не удалось создать файл календаря');
  }
}
