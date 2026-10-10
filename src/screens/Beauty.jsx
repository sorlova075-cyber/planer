// Красота: утренняя и вечерняя рутина, уход по расписанию.
import { useState } from 'react';
import { useStore } from '../store.jsx';
import { Header } from '../Settings.jsx';
import { Sheet, Seg, CheckRow, Progress, DelBtn, EditToggle, Empty, useUi } from '../ui.jsx';
import { today, diffDays, longDate, uid } from '../util.js';

function CareSheet() {
  const { up } = useStore();
  const { sheet } = useUi();
  const [t, setT] = useState('');
  const [every, setEvery] = useState(21);
  function save() {
    if (!t.trim()) return;
    up((d) => void d.care.push({ id: uid(), t: t.trim(), every: Math.max(1, Number(every) || 14), last: null }));
    sheet.close();
  }
  return (
    <Sheet title="Новый уход по расписанию">
      <label className="lab" htmlFor="cr-t">
        Что
      </label>
      <input className="in" id="cr-t" type="text" placeholder="Например, окрашивание" autoFocus value={t} onChange={(e) => setT(e.target.value)} />
      <label className="lab" htmlFor="cr-e">
        Как часто, раз в сколько дней
      </label>
      <input className="in" id="cr-e" type="number" inputMode="numeric" min="1" value={every} onChange={(e) => setEvery(e.target.value)} />
      <button className="btn full" onClick={save}>
        Добавить
      </button>
    </Sheet>
  );
}

export default function Beauty() {
  const { S, up } = useStore();
  const { sheet, toast } = useUi();
  const t = today();
  const [part, setPart] = useState(new Date().getHours() < 16 ? 'am' : 'pm');
  const [edit, setEdit] = useState(false);
  const [newStep, setNewStep] = useState('');

  const steps = S.routines[part];
  const log = (S.routineLog[t] && S.routineLog[t][part]) || [];
  const doneCount = steps.filter((s) => log.includes(s.id)).length;

  function toggle(id) {
    up((d) => {
      d.routineLog[t] = d.routineLog[t] || { am: [], pm: [] };
      const arr = d.routineLog[t][part] || [];
      d.routineLog[t][part] = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
    });
  }
  function addStep() {
    const v = newStep.trim();
    if (!v) return;
    up((d) => void d.routines[part].push({ id: uid(), t: v }));
    setNewStep('');
  }

  return (
    <>
      <Header sub="Рутины и расписание ухода" title="Красота" />
      <Seg
        items={[
          ['am', 'Утро'],
          ['pm', 'Вечер']
        ]}
        value={part}
        onChange={(v) => {
          setPart(v);
          setEdit(false);
        }}
      />

      <section className="card">
        <div className="card-h">
          <h2>{part === 'am' ? 'Утренний уход' : 'Вечерний уход'}</h2>
          <EditToggle edit={edit} setEdit={setEdit} />
        </div>
        {steps.length > 0 && <Progress done={doneCount} total={steps.length} />}
        {steps.length === 0 && <Empty>Добавьте шаги вашего ухода.</Empty>}
        <div className="list">
          {steps.map((s) =>
            edit ? (
              <div className="static" key={s.id}>
                <div className="tx">{s.t}</div>
                <DelBtn onClick={() => up((d) => void (d.routines[part] = d.routines[part].filter((x) => x.id !== s.id)))} label={'Удалить: ' + s.t} />
              </div>
            ) : (
              <CheckRow key={s.id} text={s.t} done={log.includes(s.id)} onClick={() => toggle(s.id)} />
            )
          )}
        </div>
        {edit && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="in"
              placeholder="Новый шаг"
              aria-label="Новый шаг"
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addStep()}
            />
            <button className="btn sm" style={{ marginTop: 8 }} onClick={addStep}>
              Добавить
            </button>
          </div>
        )}
        {!edit && steps.length > 0 && doneCount === steps.length && (
          <p className="sub" style={{ marginTop: 8 }}>
            Рутина выполнена. Кожа скажет спасибо.
          </p>
        )}
      </section>

      <section className="card">
        <h2>Уход по расписанию</h2>
        {S.care.length === 0 && <Empty>Добавьте маникюр, брови, стрижку, и приложение подскажет, когда пора.</Empty>}
        <div className="list">
          {S.care.map((c) => {
            const since = c.last ? diffDays(c.last, t) : null;
            const overdue = since !== null && since >= c.every;
            const sub = c.last ? `последний раз ${longDate(c.last)}, раз в ${c.every} дн.` : `раз в ${c.every} дн., ещё не отмечали`;
            return (
              <div className="static" key={c.id}>
                <div className="tx">
                  {c.t}
                  <small>{sub}</small>
                </div>
                {edit ? (
                  <DelBtn onClick={() => up((d) => void (d.care = d.care.filter((x) => x.id !== c.id)))} label={'Удалить: ' + c.t} />
                ) : (
                  <>
                    {overdue && (
                      <span className="pill" style={{ background: 'var(--rose2)' }}>
                        пора
                      </span>
                    )}
                    <button
                      className="btn sm ghost"
                      onClick={() => {
                        up((d) => {
                          d.care.find((x) => x.id === c.id).last = t;
                        });
                        toast('Отмечено: ' + c.t.toLowerCase());
                      }}
                    >
                      Сделала
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <button className="btn full ghost" onClick={() => sheet.open(<CareSheet />)}>
          Добавить уход
        </button>
      </section>
    </>
  );
}
