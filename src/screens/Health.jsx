// Здоровье и цикл: календарь, симптомы, вода, напоминания.
import { useState } from 'react';
import { useStore } from '../store.jsx';
import { Header } from '../Settings.jsx';
import { Sheet, Switch, DelBtn, EditToggle, Empty, Icon, useUi } from '../ui.jsx';
import { SYMPTOMS } from '../data.js';
import { cycleDay, phaseOf, ovulationDay, PHASE, daysToNextPeriod } from '../cycle.js';
import { today, ymd, parse, WD, MONTHS, cap, longDate, uid } from '../util.js';

// Настройка цикла: дата начала последних месячных, длина цикла и месячных
export function CycleSheet() {
  const { S, up } = useStore();
  const { sheet, toast } = useUi();
  const [last, setLast] = useState(S.cycle.last || today());
  const [len, setLen] = useState(S.cycle.len);
  const [period, setPeriod] = useState(S.cycle.period);

  function save() {
    const L = Math.min(45, Math.max(21, Number(len) || 28));
    const P = Math.min(10, Math.max(2, Number(period) || 5));
    up((d) => {
      d.cycle = { last, len: L, period: P };
    });
    toast('Цикл сохранён');
    sheet.close();
  }

  return (
    <Sheet title="Мой цикл">
      <label className="lab" htmlFor="cy-last">
        Первый день последних месячных
      </label>
      <input className="in" id="cy-last" type="date" max={today()} value={last} onChange={(e) => setLast(e.target.value)} />
      <div className="split-grid">
        <div>
          <label className="lab" htmlFor="cy-len">
            Длина цикла, дней
          </label>
          <input className="in" id="cy-len" type="number" inputMode="numeric" min="21" max="45" value={len} onChange={(e) => setLen(e.target.value)} />
        </div>
        <div>
          <label className="lab" htmlFor="cy-per">
            Месячные, дней
          </label>
          <input className="in" id="cy-per" type="number" inputMode="numeric" min="2" max="10" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </div>
      </div>
      <p className="sub" style={{ marginTop: 12 }}>
        Прогноз приблизительный и не заменяет консультацию врача.
      </p>
      <button className="btn full" onClick={save}>
        Сохранить
      </button>
    </Sheet>
  );
}

function ReminderSheet() {
  const { up } = useStore();
  const { sheet } = useUi();
  const [t, setT] = useState('');
  const [s, setS] = useState('');
  function save() {
    if (!t.trim()) return;
    up((d) => void d.reminders.push({ id: uid(), t: t.trim(), s: s.trim(), on: true }));
    sheet.close();
  }
  return (
    <Sheet title="Новое напоминание">
      <label className="lab" htmlFor="rm-t">
        Что напомнить
      </label>
      <input className="in" id="rm-t" type="text" placeholder="Например, гинеколог" autoFocus value={t} onChange={(e) => setT(e.target.value)} />
      <label className="lab" htmlFor="rm-s">
        Когда
      </label>
      <input className="in" id="rm-s" type="text" placeholder="Например, 24 октября, 11:30" value={s} onChange={(e) => setS(e.target.value)} />
      <button className="btn full" onClick={save}>
        Добавить
      </button>
    </Sheet>
  );
}

export default function Health() {
  const { S, up } = useStore();
  const { sheet } = useUi();
  const M = S.mods;
  const t = today();
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState(t);
  const [edit, setEdit] = useState(false);

  const water = S.water[t] || 0;
  const syms = S.sym[t] || [];

  // События на дату: дни рождения и встречи
  function eventsOn(ds) {
    const out = [];
    S.friends.forEach((f) => f.bday && f.bday.slice(5) === ds.slice(5) && out.push('День рождения: ' + f.name));
    S.events.forEach((e) => e.date === ds && out.push(e.t));
    return out;
  }

  // Календарь месяца
  const first = new Date(view.y, view.m, 1);
  const blanks = (first.getDay() + 6) % 7;
  const dim = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [];
  for (let d = 1; d <= dim; d++) {
    const ds = ymd(new Date(view.y, view.m, d));
    const n = cycleDay(S.cycle, ds);
    let c = 'day';
    if (n) {
      const p = phaseOf(S.cycle, n);
      if (p === 'menses') c += ' p';
      else if (p === 'fertile') c += n === ovulationDay(S.cycle) ? ' o' : ' f';
    }
    if (ds === t) c += ' t';
    if (ds === sel) c += ' sel';
    cells.push({ d, ds, c, ev: eventsOn(ds).length > 0 });
  }
  const move = (k) => {
    const d = new Date(view.y, view.m + k, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  const selN = cycleDay(S.cycle, sel);
  const selPhase = selN ? phaseOf(S.cycle, selN) : null;
  const selEv = eventsOn(sel);
  const toNext = daysToNextPeriod(S.cycle, t);

  const sub = M.cycle && M.health ? 'Цикл, самочувствие, напоминания' : M.cycle ? 'Календарь и самочувствие' : 'Вода, витамины, напоминания';

  return (
    <>
      <Header sub={sub} title={M.cycle && !M.health ? 'Цикл' : 'Здоровье'} />

      {M.cycle && (
        <>
          <section className="card">
            <div className="card-h">
              <button className="icon-btn" onClick={() => move(-1)} aria-label="Предыдущий месяц">
                <Icon n="back" size={18} />
              </button>
              <h2>
                {cap(MONTHS[view.m])} {view.y}
              </h2>
              <button className="icon-btn" onClick={() => move(1)} aria-label="Следующий месяц">
                <Icon n="next" size={18} />
              </button>
            </div>
            <div className="cal">
              {WD.map((w) => (
                <div key={w} className="wd">
                  {w}
                </div>
              ))}
              {Array.from({ length: blanks }).map((_, i) => (
                <div key={'b' + i} />
              ))}
              {cells.map((c) => (
                <button key={c.ds} className={c.c} onClick={() => setSel(c.ds)} aria-label={longDate(c.ds)}>
                  {c.d}
                  {c.ev ? <i /> : null}
                </button>
              ))}
            </div>
            <p className="sub" style={{ marginTop: 10 }}>
              {longDate(sel)}
              {selN ? `, день ${selN} цикла. ${PHASE[selPhase].name}.` : '.'}
              {selEv.length ? ' ' + selEv.join(', ') + '.' : ''}
            </p>
            <div className="keys" style={{ justifyContent: 'flex-start' }}>
              <span>
                <i style={{ background: 'var(--rose2)' }} />
                месячные
              </span>
              <span>
                <i style={{ background: 'var(--lilac)' }} />
                плодородные дни
              </span>
              <span>
                <i style={{ background: 'var(--plum)' }} />
                событие
              </span>
            </div>
            <div className="btn-row">
              <button
                className="btn"
                onClick={() => {
                  up((d) => void (d.cycle.last = t));
                  setSel(t);
                }}
              >
                Месячные начались сегодня
              </button>
              <button className="btn ghost" onClick={() => sheet.open(<CycleSheet />)}>
                Настроить
              </button>
            </div>
            {toNext !== null && (
              <p className="sub" style={{ marginTop: 10 }}>
                До следующих месячных примерно {toNext} дн. Прогноз приблизительный и не заменяет врача.
              </p>
            )}
            {toNext === null && (
              <p className="sub" style={{ marginTop: 10 }}>
                Отметьте начало последних месячных, и появится прогноз.
              </p>
            )}
          </section>

          <section className="card">
            <h2>Симптомы сегодня</h2>
            <div className="chips">
              {SYMPTOMS.map((s) => (
                <button
                  key={s}
                  className="chip"
                  aria-pressed={syms.includes(s)}
                  onClick={() =>
                    up((d) => {
                      const arr = d.sym[t] || [];
                      d.sym[t] = arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s];
                    })
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {M.health && (
        <>
          <section className="card">
            <div className="card-h">
              <h2>Вода</h2>
              <span className="sub">{water} из 8 стаканов</span>
            </div>
            <div className="glasses">
              {Array.from({ length: 8 }).map((_, i) => (
                <button
                  key={i}
                  className={'glass' + (i < water ? ' on' : '')}
                  aria-label={'Стакан ' + (i + 1)}
                  onClick={() => up((d) => void (d.water[t] = water === i + 1 ? i : i + 1))}
                />
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-h">
              <h2>Напоминания</h2>
              <EditToggle edit={edit} setEdit={setEdit} />
            </div>
            {S.reminders.length === 0 && <Empty>Добавьте витамины, визиты к врачу или анализы.</Empty>}
            <div className="list">
              {S.reminders.map((r) => (
                <div className="static" key={r.id}>
                  <div className="tx">
                    {r.t}
                    {r.s ? <small>{r.s}</small> : null}
                  </div>
                  {edit ? (
                    <DelBtn onClick={() => up((d) => void (d.reminders = d.reminders.filter((x) => x.id !== r.id)))} label={'Удалить: ' + r.t} />
                  ) : (
                    <Switch
                      on={r.on}
                      label={r.t}
                      onClick={() =>
                        up((d) => {
                          const x = d.reminders.find((q) => q.id === r.id);
                          x.on = !x.on;
                        })
                      }
                    />
                  )}
                </div>
              ))}
            </div>
            <button className="btn full ghost" onClick={() => sheet.open(<ReminderSheet />)}>
              Добавить напоминание
            </button>
            <p className="sub" style={{ marginTop: 10, fontSize: 13 }}>
              Уведомления на телефон появятся в следующей версии. Пока напоминания видны в приложении.
            </p>
          </section>
        </>
      )}
    </>
  );
}
