// Деньги: доходы, расходы, лимиты по категориям, копилки.
import { useState } from 'react';
import { useStore } from '../store.jsx';
import { Header } from '../Settings.jsx';
import { Sheet, DelBtn, EditToggle, Empty, Icon, useUi } from '../ui.jsx';
import { OpSheet, monthTotals } from '../components/OpSheet.jsx';
import { EXP_CATS } from '../data.js';
import { today, fmt, MONTHS, cap, longDate, uid } from '../util.js';

function LimitSheet({ cat }) {
  const { S, up } = useStore();
  const { sheet } = useUi();
  const [v, setV] = useState(S.limits[cat] || '');
  function save() {
    const n = parseFloat(String(v).replace(',', '.'));
    up((d) => {
      if (n > 0) d.limits[cat] = n;
      else delete d.limits[cat];
    });
    sheet.close();
  }
  return (
    <Sheet title={'Лимит: ' + cat}>
      <label className="lab" htmlFor="lm-v">
        Сколько можно тратить в месяц, {S.cur}
      </label>
      <input className="in big" id="lm-v" type="number" inputMode="decimal" placeholder="Без лимита" autoFocus value={v} onChange={(e) => setV(e.target.value)} />
      <p className="sub" style={{ marginTop: 10 }}>
        Оставьте поле пустым, чтобы убрать лимит.
      </p>
      <button className="btn full" onClick={save}>
        Сохранить
      </button>
    </Sheet>
  );
}

function GoalSheet() {
  const { S, up } = useStore();
  const { sheet } = useUi();
  const [t, setT] = useState('');
  const [target, setTarget] = useState('');
  function save() {
    const n = parseFloat(String(target).replace(',', '.'));
    if (!t.trim() || !(n > 0)) return;
    up((d) => void d.goals.push({ id: uid(), t: t.trim(), target: n, saved: 0 }));
    sheet.close();
  }
  return (
    <Sheet title="Новая копилка">
      <label className="lab" htmlFor="gl-t">
        На что копим
      </label>
      <input className="in" id="gl-t" type="text" placeholder="Например, отпуск" autoFocus value={t} onChange={(e) => setT(e.target.value)} />
      <label className="lab" htmlFor="gl-s">
        Нужная сумма, {S.cur}
      </label>
      <input className="in" id="gl-s" type="number" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
      <button className="btn full" onClick={save}>
        Создать
      </button>
    </Sheet>
  );
}

function DepositSheet({ goalId }) {
  const { S, up } = useStore();
  const { sheet } = useUi();
  const [v, setV] = useState('');
  const g = S.goals.find((x) => x.id === goalId);
  function save() {
    const n = parseFloat(String(v).replace(',', '.'));
    if (!(n > 0)) return;
    up((d) => {
      d.goals.find((x) => x.id === goalId).saved += n;
    });
    sheet.close();
  }
  return (
    <Sheet title={'Отложить: ' + (g ? g.t : '')}>
      <label className="lab" htmlFor="dp-v">
        Сумма, {S.cur}
      </label>
      <input className="in big" id="dp-v" type="number" inputMode="decimal" placeholder="0" autoFocus value={v} onChange={(e) => setV(e.target.value)} />
      <button className="btn full" onClick={save}>
        Отложить
      </button>
    </Sheet>
  );
}

export default function Money() {
  const { S, up } = useStore();
  const { sheet } = useUi();
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [edit, setEdit] = useState(false);

  const prefix = view.y + '-' + String(view.m + 1).padStart(2, '0');
  const tot = monthTotals(S.ops, prefix);
  const bal = tot.inc - tot.exp;
  const monthOps = S.ops.filter((o) => o.d.startsWith(prefix)).sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
  const spent = (cat) => monthOps.filter((o) => o.type === 'exp' && o.cat === cat).reduce((s, o) => s + o.a, 0);
  const money = (n) => fmt(n) + '\u00A0' + S.cur;
  const move = (k) => {
    const d = new Date(view.y, view.m + k, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const isNow = view.y === now.getFullYear() && view.m === now.getMonth();

  return (
    <>
      <Header sub={isNow ? 'В этом месяце' : String(view.y)} title="Деньги" />

      <div className="card-h" style={{ marginTop: 10, justifyContent: 'center', gap: 14, alignItems: 'center' }}>
        <button className="icon-btn" onClick={() => move(-1)} aria-label="Предыдущий месяц">
          <Icon n="back" size={18} />
        </button>
        <h2 style={{ minWidth: 130, textAlign: 'center' }}>{cap(MONTHS[view.m])}</h2>
        <button className="icon-btn" onClick={() => move(1)} aria-label="Следующий месяц">
          <Icon n="next" size={18} />
        </button>
      </div>

      <div className="sum">
        <div>
          <small>Доходы</small>
          <b>{money(tot.inc)}</b>
        </div>
        <div>
          <small>Расходы</small>
          <b>{money(tot.exp)}</b>
        </div>
        <div>
          <small>Остаток</small>
          <b>{money(bal)}</b>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn" onClick={() => sheet.open(<OpSheet type="exp" />)}>
          Добавить трату
        </button>
        <button className="btn ghost" onClick={() => sheet.open(<OpSheet type="inc" />)}>
          Добавить доход
        </button>
      </div>

      <section className="card">
        <h2>Расходы по категориям</h2>
        <p className="sub" style={{ margin: '4px 0 6px' }}>
          Нажмите на категорию, чтобы задать месячный лимит.
        </p>
        {EXP_CATS.map((c, i) => {
          const sp = spent(c);
          const lim = S.limits[c];
          const p = lim ? Math.min(100, Math.round((sp / lim) * 100)) : 0;
          if (!lim && !sp) {
            return (
              <button key={c} className="cat linkcard" onClick={() => sheet.open(<LimitSheet cat={c} />)}>
                <div className="cat-h">
                  <span>{c}</span>
                  <span>нет трат, лимит не задан</span>
                </div>
              </button>
            );
          }
          return (
            <button key={c} className="cat linkcard" onClick={() => sheet.open(<LimitSheet cat={c} />)}>
              <div className="cat-h">
                <span>{c}</span>
                <span>
                  {money(sp)}
                  {lim ? ' из ' + fmt(lim) : ''}
                </span>
              </div>
              <div className={'bar ' + (i % 2 ? 'l' : '')}>
                <i style={{ width: (lim ? p : sp ? 100 : 0) + '%', opacity: lim ? 1 : 0.35 }} />
              </div>
            </button>
          );
        })}
      </section>

      <section className="card">
        <div className="card-h">
          <h2>Копилки</h2>
        </div>
        {S.goals.length === 0 && <Empty>Создайте копилку на отпуск, подушку безопасности или покупку.</Empty>}
        <div className="list">
          {S.goals.map((g) => {
            const p = Math.min(100, Math.round((g.saved / g.target) * 100));
            return (
              <div key={g.id} className="cat">
                <div className="cat-h">
                  <span>{g.t}</span>
                  <span>
                    {money(g.saved)} из {fmt(g.target)}
                  </span>
                </div>
                <div className="bar w">
                  <i style={{ width: p + '%' }} />
                </div>
                <div className="btn-row" style={{ marginTop: 10 }}>
                  <button className="btn sm ghost" onClick={() => sheet.open(<DepositSheet goalId={g.id} />)}>
                    Отложить
                  </button>
                  <button className="btn sm ghost" onClick={() => up((d) => void (d.goals = d.goals.filter((x) => x.id !== g.id)))}>
                    Удалить
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <button className="btn full ghost" onClick={() => sheet.open(<GoalSheet />)}>
          Новая копилка
        </button>
      </section>

      <section className="card">
        <div className="card-h">
          <h2>Операции</h2>
          {monthOps.length > 0 && <EditToggle edit={edit} setEdit={setEdit} />}
        </div>
        {monthOps.length === 0 && <Empty>В этом месяце пока нет операций.</Empty>}
        <div className="list">
          {monthOps.slice(0, 40).map((o) => (
            <div className="static" key={o.id}>
              <div className="tx">
                {o.note || o.cat}
                <small>
                  {o.cat}, {longDate(o.d)}
                </small>
              </div>
              {edit ? (
                <DelBtn onClick={() => up((d) => void (d.ops = d.ops.filter((x) => x.id !== o.id)))} label="Удалить операцию" />
              ) : (
                <span className={'amt' + (o.type === 'inc' ? ' inc' : '')}>
                  {o.type === 'inc' ? '+' : '−'}
                  {money(o.a)}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
