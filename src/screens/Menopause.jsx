// Менопауза и перименопауза: приливы, сон, симптомы, сводка для врача.
import { useState } from 'react';
import { useStore } from '../store.jsx';
import { Header } from '../Settings.jsx';
import { Sheet, Chip, Icon, useUi } from '../ui.jsx';
import { MENO_SYMPTOMS, SLEEP_LABELS } from '../data.js';
import { today, addDays, diffDays, longDate, uid, daysWord } from '../util.js';

const CHECKS = ['Маммография', 'Гинеколог', 'Денситометрия', 'Анализы по назначению врача'];

// Текст сводки за 30 дней
function buildSummary(S, t) {
  const days = Array.from({ length: 30 }, (_, i) => addDays(t, -(29 - i)));
  const hot = days.map((d) => S.meno.hot[d] || 0);
  const total = hot.reduce((a, b) => a + b, 0);
  const withHot = hot.filter((n) => n > 0).length;
  const max = Math.max(0, ...hot);
  const sleeps = days.map((d) => S.meno.sleep[d]).filter(Boolean);
  const sleepAvg = sleeps.length ? (sleeps.reduce((a, b) => a + b, 0) / sleeps.length).toFixed(1).replace('.', ',') : null;
  const count = {};
  days.forEach((d) => (S.meno.sym[d] || []).forEach((s) => (count[s] = (count[s] || 0) + 1)));
  const top = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const lines = ['Сводка за 30 дней (с ' + longDate(days[0]) + ' по ' + longDate(days[29]) + ')'];
  if (!total && !sleeps.length && !top.length) {
    lines.push('Пока мало записей. Отмечайте симптомы несколько недель, и сводка станет полезной.');
  } else {
    lines.push(`Приливы: всего ${total}, дней с приливами ${withHot}, максимум за день ${max}.`);
    lines.push(sleepAvg ? `Сон: средняя оценка ${sleepAvg} из 5 (записей: ${sleeps.length}).` : 'Сон: оценок пока нет.');
    lines.push(top.length ? 'Частые симптомы: ' + top.map(([s, n]) => `${s.toLowerCase()} (${n} ${daysWord(n)})`).join(', ') + '.' : 'Симптомы: отметок пока нет.');
  }
  if (S.cycle.last) lines.push(`Последние месячные: ${longDate(S.cycle.last)} (${diffDays(S.cycle.last, t)} ${daysWord(diffDays(S.cycle.last, t))} назад).`);
  return lines.join('\n');
}

function SummarySheet({ text }) {
  const { toast } = useUi();
  function copy() {
    try {
      navigator.clipboard.writeText(text).then(
        () => toast('Сводка скопирована'),
        () => toast('Не удалось скопировать')
      );
    } catch (e) {
      toast('Не удалось скопировать');
    }
  }
  return (
    <Sheet title="Сводка для врача">
      <pre className="summary">{text}</pre>
      <button className="btn full" onClick={copy}>
        Скопировать
      </button>
      <p className="sub" style={{ marginTop: 10, fontSize: 13 }}>
        Покажите сводку на приёме или отправьте её врачу. Она основана только на ваших отметках.
      </p>
    </Sheet>
  );
}

export default function Menopause() {
  const { S, up } = useStore();
  const { sheet, toast } = useUi();
  const t = today();
  const hot = S.meno.hot[t] || 0;
  const sleep = S.meno.sleep[t] || 0;
  const syms = S.meno.sym[t] || [];
  const [showMore, setShowMore] = useState(false);

  // График приливов за 14 дней
  const days = Array.from({ length: 14 }, (_, i) => addDays(t, -(13 - i)));
  const vals = days.map((d) => S.meno.hot[d] || 0);
  const mx = Math.max(1, ...vals);

  function addCheck(name) {
    if (S.reminders.some((r) => r.t === name)) return toast('Уже в напоминаниях');
    up((d) => void d.reminders.push({ id: uid(), t: name, s: '', on: true }));
    toast('Добавлено в напоминания');
  }

  return (
    <>
      <Header sub="Приливы, сон, самочувствие" title="Менопауза" />

      <section className="card soft">
        <p className="sub">Перименопауза и менопауза проходят у каждой по-своему. Здесь можно спокойно отмечать самочувствие и приносить врачу ясную картину.</p>
      </section>

      <section className="card">
        <h2>Приливы сегодня</h2>
        <div className="counter">
          <button className="icon-btn" aria-label="Убрать прилив" onClick={() => up((d) => void (d.meno.hot[t] = Math.max(0, hot - 1)))}>
            <Icon n="minus" size={22} />
          </button>
          <b aria-live="polite">{hot}</b>
          <button className="icon-btn" aria-label="Добавить прилив" onClick={() => up((d) => void (d.meno.hot[t] = hot + 1))}>
            <Icon n="plus" size={22} />
          </button>
        </div>

        <span className="lab">Как спалось?</span>
        <div className="chips" style={{ marginTop: 8 }}>
          {SLEEP_LABELS.map((l, i) => (
            <Chip key={l} on={sleep === i + 1} onClick={() => up((d) => void (d.meno.sleep[t] = sleep === i + 1 ? 0 : i + 1))}>
              {l}
            </Chip>
          ))}
        </div>

        <span className="lab">Что беспокоит сегодня</span>
        <div className="chips" style={{ marginTop: 8 }}>
          {MENO_SYMPTOMS.map((s) => (
            <Chip
              key={s}
              on={syms.includes(s)}
              onClick={() =>
                up((d) => {
                  const arr = d.meno.sym[t] || [];
                  d.meno.sym[t] = arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s];
                })
              }
            >
              {s}
            </Chip>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-h">
          <h2>Приливы за 14 дней</h2>
        </div>
        <div className="bars" role="img" aria-label={'Приливы за 14 дней: ' + vals.join(', ')}>
          {vals.map((n, i) => (
            <div key={days[i]}>
              <i style={{ height: Math.max(4, (n / mx) * 100) + '%', opacity: n ? 1 : 0.3 }} />
              <span>{Number(days[i].slice(8))}</span>
            </div>
          ))}
        </div>
        <p className="sub" style={{ marginTop: 10 }}>
          Пик за период: {Math.max(...vals)} в день. Так проще заметить, что усиливает приливы.
        </p>
      </section>

      <section className="card">
        <h2>Месячные</h2>
        {S.cycle.last ? (
          <p className="sub" style={{ marginTop: 6 }}>
            Последние: {longDate(S.cycle.last)}, прошло {diffDays(S.cycle.last, t)} {daysWord(diffDays(S.cycle.last, t))}. Врачи обычно говорят о менопаузе, когда месячных нет 12 месяцев подряд.
          </p>
        ) : (
          <p className="sub" style={{ marginTop: 6 }}>
            Отметьте дату последних месячных, чтобы видеть, сколько дней прошло.
          </p>
        )}
        <button className="btn full ghost" onClick={() => { up((d) => void (d.cycle.last = t)); toast('Месячные отмечены сегодня'); }}>
          Месячные начались сегодня
        </button>
      </section>

      <section className="card">
        <h2>К врачу</h2>
        <p className="sub" style={{ marginTop: 6 }}>
          Соберите сводку за 30 дней: приливы, сон, частые симптомы.
        </p>
        <button className="btn full" onClick={() => sheet.open(<SummarySheet text={buildSummary(S, t)} />)}>
          Собрать сводку для врача
        </button>
        <span className="lab">Добавить проверку в напоминания</span>
        <div className="chips" style={{ marginTop: 8 }}>
          {CHECKS.map((c) => (
            <Chip key={c} onClick={() => addCheck(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-h">
          <h2>Что иногда помогает</h2>
          <button className="btn ghost sm" onClick={() => setShowMore(!showMore)}>
            {showMore ? 'Скрыть' : 'Показать'}
          </button>
        </div>
        {showMore && (
          <div className="list">
            <div className="static"><div className="tx">Прохладная спальня и лёгкая одежда слоями</div></div>
            <div className="static"><div className="tx">Регулярная умеренная нагрузка и прогулки</div></div>
            <div className="static"><div className="tx">Меньше кофеина и алкоголя вечером</div></div>
            <div className="static"><div className="tx">Спокойный вечерний ритуал перед сном</div></div>
            <p className="sub" style={{ marginTop: 8, fontSize: 13 }}>
              Это общие подсказки, а не лечение. Если симптомы мешают жить, обсудите их с врачом.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
