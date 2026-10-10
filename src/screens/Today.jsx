// Главный экран: сводка дня, быстрые действия, неделя, план дня.
import { useState } from 'react';
import { useStore } from '../store.jsx';
import { Header } from '../Settings.jsx';
import { CheckRow, Progress, DelBtn, EditToggle, Icon, useUi } from '../ui.jsx';
import { OpSheet, monthTotals } from '../components/OpSheet.jsx';
import { CycleSheet } from './Health.jsx';
import { MOODS, GIFT_TEXT } from '../data.js';
import { cycleDay, phaseOf, PHASE } from '../cycle.js';
import { today, addDays, diffDays, fmt, greeting, weekdayDate, WD, nextBirthday, inDays, longDate, uid } from '../util.js';

// Ближайшие дни рождения и встречи (для сводки)
export function upcoming(S, t) {
  const items = [];
  S.friends.forEach((f) => {
    if (!f.bday) return;
    const nb = nextBirthday(f.bday, t);
    items.push({ kind: 'bday', days: nb.days, date: nb.date, title: 'День рождения: ' + f.name, friend: f });
  });
  S.events.forEach((e) => {
    const dd = diffDays(t, e.date);
    if (dd >= 0) items.push({ kind: 'event', days: dd, date: e.date, title: e.t, event: e });
  });
  return items.sort((a, b) => a.days - b.days);
}

export default function Today() {
  const { S, up } = useStore();
  const { sheet, setTab, toast } = useUi();
  const [moodOpen, setMoodOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [newHabit, setNewHabit] = useState('');

  const M = S.mods;
  const t = today();
  const done = S.habitLog[t] || [];
  const left = S.habits.filter((h) => !done.includes(h.id)).length;
  const cd = cycleDay(S.cycle, t);
  const ph = cd ? phaseOf(S.cycle, cd) : null;
  const mood = S.mood[t];
  const name = S.name.trim();
  const soon = upcoming(S, t);

  // Строки сводки «Главное на сегодня»
  const lines = [];
  if (M.cycle) {
    lines.push(ph ? PHASE[ph].name + ': ' + PHASE[ph].hint : 'Отметьте начало месячных в разделе «Здоровье», и появится прогноз.');
  }
  if (M.meno && (S.meno.hot[t] || 0) > 0) lines.push('Приливов сегодня: ' + S.meno.hot[t] + '.');
  if (M.habits && S.habits.length) lines.push(left ? `Осталось дел: ${left} из ${S.habits.length}.` : 'Все дела на сегодня сделаны.');
  if (M.beauty) {
    const due = S.care.filter((c) => c.last && diffDays(c.last, t) >= c.every).map((c) => c.t);
    if (due.length) lines.push('Пора: ' + due.join(', ').toLowerCase() + '.');
  }
  if (M.life) {
    soon
      .filter((x) => x.days <= (x.kind === 'bday' ? 14 : 7))
      .slice(0, 2)
      .forEach((x) => lines.push(x.title + ', ' + inDays(x.days) + '.'));
  }

  function toggleHabit(id) {
    up((d) => {
      const arr = d.habitLog[t] || [];
      d.habitLog[t] = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
    });
  }
  function addHabit() {
    const v = newHabit.trim();
    if (!v) return;
    up((d) => void d.habits.push({ id: uid(), t: v, s: '' }));
    setNewHabit('');
  }
  function removeHabit(id) {
    up((d) => void (d.habits = d.habits.filter((h) => h.id !== id)));
  }
  function addFlash() {
    const n = (S.meno.hot[t] || 0) + 1;
    up((d) => void (d.meno.hot[t] = n));
    toast('Приливов сегодня: ' + n);
  }
  function addWater() {
    const n = Math.min(8, (S.water[t] || 0) + 1);
    up((d) => void (d.water[t] = n));
    toast('Вода: ' + n + ' из 8');
  }

  // Неделя с понедельника
  const dow = (new Date().getDay() + 6) % 7;
  const weekStart = addDays(t, -dow);
  const week = Array.from({ length: 7 }, (_, i) => {
    const ds = addDays(weekStart, i);
    const n = cycleDay(S.cycle, ds);
    const p = n ? phaseOf(S.cycle, n) : null;
    return { ds, day: Number(ds.slice(8)), p, now: ds === t };
  });
  const dotColor = (w) => (w.now ? 'var(--on-plum)' : w.p === 'menses' ? 'var(--rose)' : w.p === 'fertile' ? 'var(--lilac)' : 'var(--dot)');

  // Деньги за месяц
  const mp = t.slice(0, 7);
  const mt = monthTotals(S.ops, mp);
  const limSum = Object.values(S.limits).reduce((s, v) => s + (Number(v) || 0), 0);
  const limPct = limSum ? Math.min(100, Math.round((mt.exp / limSum) * 100)) : 0;

  const next = soon[0];

  return (
    <>
      <Header sub={weekdayDate(t)} title={greeting() + (name ? ', ' + name : '')} />

      <section className="lead">
        {M.cycle && cd && <span className="pill">день {cd} цикла</span>}
        <h2 style={{ marginTop: M.cycle && cd ? 12 : 0 }}>Главное на сегодня</h2>
        {lines.length ? (
          lines.map((l, i) => (
            <p key={i} className="lead-l">
              {l}
            </p>
          ))
        ) : (
          <p className="lead-l">Спокойный день. Можно ничего не планировать.</p>
        )}
        {M.cycle && !cd && (
          <button className="btn sm" style={{ marginTop: 12 }} onClick={() => sheet.open(<CycleSheet />)}>
            Отметить месячные
          </button>
        )}
      </section>

      <div className="qa">
        {M.health && (
          <button onClick={addWater}>
            <span className="qi">
              <Icon n="drop" size={22} />
            </span>
            Вода
          </button>
        )}
        {M.money && (
          <button onClick={() => sheet.open(<OpSheet type="exp" />)}>
            <span className="qi">
              <Icon n="money" size={22} />
            </span>
            Трата
          </button>
        )}
        {M.meno && (
          <button onClick={addFlash}>
            <span className="qi">
              <Icon n="meno" size={22} />
            </span>
            Прилив
          </button>
        )}
        {(M.cycle || M.health || M.meno) && (
          <button onClick={() => setMoodOpen(!moodOpen)}>
            <span className="qi">
              <Icon n="smile" size={22} />
            </span>
            Настроение
          </button>
        )}
        {M.life && (
          <button onClick={() => setTab('life')}>
            <span className="qi">
              <Icon n="life" size={22} />
            </span>
            Подруги
          </button>
        )}
      </div>

      {moodOpen && (M.cycle || M.health || M.meno) && (
        <section className="card">
          <h2>Как вы себя чувствуете?</h2>
          <div className="chips">
            {Object.keys(MOODS).map((m) => (
              <button key={m} className="chip" aria-pressed={mood === m} onClick={() => up((d) => void (d.mood[t] = m))}>
                {m}
              </button>
            ))}
          </div>
          {mood && (
            <p className="sub" style={{ marginTop: 12 }}>
              {MOODS[mood]}
            </p>
          )}
        </section>
      )}

      <div className="week">
        {week.map((w, i) => (
          <div key={w.ds} className={'wk' + (w.now ? ' now' : '')}>
            {WD[i]}
            <b>{w.day}</b>
            <i style={{ background: dotColor(w) }} />
          </div>
        ))}
      </div>

      {M.habits && (
        <section className="card">
          <div className="card-h">
            <h2>План дня</h2>
            <EditToggle edit={edit} setEdit={setEdit} />
          </div>
          {S.habits.length > 0 && <Progress done={S.habits.length - left} total={S.habits.length} />}
          <div className="list">
            {S.habits.map((h) =>
              edit ? (
                <div className="static" key={h.id}>
                  <div className="tx">{h.t}</div>
                  <DelBtn onClick={() => removeHabit(h.id)} label={'Удалить: ' + h.t} />
                </div>
              ) : (
                <CheckRow key={h.id} text={h.t} small={h.s} done={done.includes(h.id)} onClick={() => toggleHabit(h.id)} />
              )
            )}
          </div>
          {edit && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="in"
                placeholder="Новое дело"
                aria-label="Новое дело"
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addHabit()}
              />
              <button className="btn sm" style={{ marginTop: 8 }} onClick={addHabit}>
                Добавить
              </button>
            </div>
          )}
        </section>
      )}

      {M.money && (
        <button className="card linkcard" onClick={() => setTab('money')}>
          <div className="card-h">
            <h2>Деньги</h2>
            <span className="sub">в этом месяце</span>
          </div>
          <p className="sub">
            Потрачено {fmt(mt.exp)} {S.cur}
            {limSum ? ` из ${fmt(limSum)} по лимитам` : ''}
          </p>
          {limSum > 0 && (
            <div className="prog">
              <div className="bar w">
                <i style={{ width: limPct + '%' }} />
              </div>
              <span>{limPct}%</span>
            </div>
          )}
        </button>
      )}

      {M.life && (
        <button className="card soft linkcard" onClick={() => setTab('life')}>
          <h2>Ближайшее с подругами</h2>
          {next ? (
            <>
              <p className="sub" style={{ marginTop: 6 }}>
                {longDate(next.date)}, {next.title.toLowerCase()}.
                {next.kind === 'bday' && next.friend && next.days <= 14 ? ' ' + GIFT_TEXT[next.friend.gift || 0] : ''}
              </p>
              {soon[1] && (
                <p className="sub" style={{ marginTop: 4 }}>
                  {longDate(soon[1].date)}, {soon[1].title.toLowerCase()}.
                </p>
              )}
            </>
          ) : (
            <p className="sub" style={{ marginTop: 6 }}>
              Добавьте подруг и встречи, и здесь появятся ближайшие события.
            </p>
          )}
        </button>
      )}
    </>
  );
}
