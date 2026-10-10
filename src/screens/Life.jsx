// Подруги и встречи: дни рождения, подарки, встречи с чек-листом, делёж счёта.
import { useState } from 'react';
import { useStore } from '../store.jsx';
import { Header } from '../Settings.jsx';
import { Sheet, Chip, CheckRow, Progress, DelBtn, EditToggle, Empty, Icon, useUi } from '../ui.jsx';
import { GIFT_STEPS, GIFT_TEXT, DEFAULT_PACK } from '../data.js';
import { cycleDay } from '../cycle.js';
import { today, nextBirthday, inDays, longDate, weekdayDate, fmt, uid } from '../util.js';

function FriendSheet({ friendId }) {
  const { S, up } = useStore();
  const { sheet } = useUi();
  const f = friendId ? S.friends.find((x) => x.id === friendId) : null;
  const [name, setName] = useState(f ? f.name : '');
  const [bday, setBday] = useState(f ? f.bday || '' : '');
  const [idea, setIdea] = useState(f ? f.idea || '' : '');
  const [gift, setGift] = useState(f ? f.gift || 0 : 0);

  function save() {
    if (!name.trim()) return;
    up((d) => {
      if (f) {
        const x = d.friends.find((q) => q.id === f.id);
        Object.assign(x, { name: name.trim(), bday, idea: idea.trim(), gift });
      } else d.friends.push({ id: uid(), name: name.trim(), bday, idea: idea.trim(), gift });
    });
    sheet.close();
  }
  function remove() {
    up((d) => void (d.friends = d.friends.filter((x) => x.id !== f.id)));
    sheet.close();
  }

  return (
    <Sheet title={f ? f.name : 'Новая подруга'}>
      <label className="lab" htmlFor="fr-n">
        Имя
      </label>
      <input className="in" id="fr-n" type="text" autoFocus={!f} value={name} onChange={(e) => setName(e.target.value)} />
      <label className="lab" htmlFor="fr-b">
        День рождения
      </label>
      <input className="in" id="fr-b" type="date" value={bday} onChange={(e) => setBday(e.target.value)} />
      <label className="lab" htmlFor="fr-i">
        Идея подарка
      </label>
      <input className="in" id="fr-i" type="text" placeholder="Например, шёлковый шарф" value={idea} onChange={(e) => setIdea(e.target.value)} />
      <span className="lab">Статус подарка</span>
      <div className="chips" style={{ marginTop: 8 }}>
        {GIFT_STEPS.map((g, i) => (
          <Chip key={g} on={gift === i} onClick={() => setGift(i)}>
            {g}
          </Chip>
        ))}
      </div>
      <p className="sub" style={{ marginTop: 10 }}>
        {GIFT_TEXT[gift]}
      </p>
      <button className="btn full" onClick={save}>
        Сохранить
      </button>
      {f && (
        <button className="btn full ghost" onClick={remove}>
          Удалить подругу
        </button>
      )}
    </Sheet>
  );
}

function EventSheet() {
  const { up } = useStore();
  const { sheet } = useUi();
  const [t, setT] = useState('');
  const [date, setDate] = useState(today());
  const [time, setTime] = useState('');
  const [pack, setPack] = useState(false);

  function save() {
    if (!t.trim()) return;
    up((d) =>
      void d.events.push({
        id: uid(),
        t: t.trim(),
        date,
        time,
        items: pack ? DEFAULT_PACK.map((x) => ({ id: uid(), t: x, d: false })) : []
      })
    );
    sheet.close();
  }

  return (
    <Sheet title="Новая встреча">
      <label className="lab" htmlFor="ev-t">
        Что планируем
      </label>
      <input className="in" id="ev-t" type="text" placeholder="Например, баня с девочками" autoFocus value={t} onChange={(e) => setT(e.target.value)} />
      <div className="split-grid">
        <div>
          <label className="lab" htmlFor="ev-d">
            Дата
          </label>
          <input className="in" id="ev-d" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="lab" htmlFor="ev-tm">
            Время
          </label>
          <input className="in" id="ev-tm" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <div className="chips" style={{ marginTop: 14 }}>
        <Chip on={pack} onClick={() => setPack(!pack)}>
          Список «что взять в баню»
        </Chip>
      </div>
      <button className="btn full" onClick={save}>
        Добавить
      </button>
    </Sheet>
  );
}

function EventCard({ ev }) {
  const { S, up } = useStore();
  const { toast } = useUi();
  const [text, setText] = useState('');
  const done = ev.items.filter((i) => i.d).length;
  const n = cycleDay(S.cycle, ev.date);

  function toggle(id) {
    up((d) => {
      const x = d.events.find((q) => q.id === ev.id).items.find((i) => i.id === id);
      x.d = !x.d;
    });
  }
  function add() {
    const v = text.trim();
    if (!v) return;
    up((d) => void d.events.find((q) => q.id === ev.id).items.push({ id: uid(), t: v, d: false }));
    setText('');
  }
  function copy() {
    const msg = `Девочки, ${ev.t.toLowerCase()}: ${longDate(ev.date)}${ev.time ? ' в ' + ev.time : ''}. Кто с нами?`;
    try {
      navigator.clipboard.writeText(msg).then(
        () => toast('Приглашение скопировано'),
        () => toast('Не удалось скопировать')
      );
    } catch (e) {
      toast('Не удалось скопировать');
    }
  }

  return (
    <section className="card">
      <div className="card-h">
        <h2>{ev.t}</h2>
        <DelBtn onClick={() => up((d) => void (d.events = d.events.filter((x) => x.id !== ev.id)))} label={'Удалить встречу: ' + ev.t} />
      </div>
      <p className="sub">
        {weekdayDate(ev.date)}
        {ev.time ? ', ' + ev.time : ''}, {inDays(Math.round((new Date(ev.date) - new Date(today())) / 86400000))}
      </p>
      {S.mods.cycle && n && (
        <div className="hint">
          <Icon n="lock" size={18} />
          <span>Эта дата придётся на {n}-й день вашего цикла. Подсказку видите только вы.</span>
        </div>
      )}
      <p style={{ marginTop: 14, fontWeight: 700 }}>Что взять и сделать</p>
      {ev.items.length > 0 && <Progress done={done} total={ev.items.length} cls="l" />}
      <div className="list">
        {ev.items.map((i) => (
          <CheckRow key={i.id} text={i.t} done={i.d} onClick={() => toggle(i.id)} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="in" placeholder="Добавить пункт" aria-label="Добавить пункт" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn sm" style={{ marginTop: 8 }} onClick={add}>
          Добавить
        </button>
      </div>
      <button className="btn full" onClick={copy}>
        Скопировать приглашение
      </button>
    </section>
  );
}

function Split() {
  const { S } = useStore();
  const [total, setTotal] = useState('');
  const [people, setPeople] = useState(4);
  const [payer, setPayer] = useState('Вы');
  const [other, setOther] = useState('');

  const t = parseFloat(String(total).replace(',', '.')) || 0;
  const p = Math.max(1, Math.floor(Number(people) || 1));
  const share = t / p;
  const m = (n) => fmt(n) + '\u00A0' + S.cur;
  const names = ['Вы', ...S.friends.slice(0, 4).map((f) => f.name)];

  let res = 'Введите сумму счёта.';
  if (t > 0) {
    if (payer === 'Вы') res = `Каждая платит по ${m(share)}. Подруги переводят вам по ${m(share)}.`;
    else res = `Каждая платит по ${m(share)}. Вы переводите ${payer} ${m(share)}.`;
  }

  return (
    <section className="card">
      <h2>Делим счёт</h2>
      <div className="split-grid">
        <div>
          <label className="lab" htmlFor="sp-t">
            Сумма счёта, {S.cur}
          </label>
          <input className="in" id="sp-t" type="number" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} />
        </div>
        <div>
          <label className="lab" htmlFor="sp-p">
            Сколько человек
          </label>
          <input className="in" id="sp-p" type="number" inputMode="numeric" min="1" value={people} onChange={(e) => setPeople(e.target.value)} />
        </div>
      </div>
      <span className="lab">Кто заплатил</span>
      <div className="chips" style={{ marginTop: 8 }}>
        {names.map((n) => (
          <Chip key={n} on={payer === n} onClick={() => setPayer(n)}>
            {n}
          </Chip>
        ))}
      </div>
      <div className="result" role="status">
        {res}
      </div>
    </section>
  );
}

export default function Life() {
  const { S } = useStore();
  const { sheet } = useUi();
  const t = today();
  const [edit, setEdit] = useState(false);

  const bdays = S.friends
    .filter((f) => f.bday)
    .map((f) => ({ f, ...nextBirthday(f.bday, t) }))
    .sort((a, b) => a.days - b.days);
  const events = S.events.filter((e) => e.date >= t).sort((a, b) => (a.date < b.date ? -1 : 1));
  const past = S.events.filter((e) => e.date < t);

  return (
    <>
      <Header sub="Подруги и встречи" title="Жизнь" />

      <div className="friends">
        {S.friends.map((f, i) => (
          <button key={f.id} className="fr" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => sheet.open(<FriendSheet friendId={f.id} />)}>
            <div className={'av a' + (i % 4)}>{f.name.charAt(0).toUpperCase()}</div>
            {f.name}
          </button>
        ))}
        <button className="fr" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => sheet.open(<FriendSheet />)}>
          <div className="av add">
            <Icon n="plus" size={22} />
          </div>
          Добавить
        </button>
      </div>

      <section className="card">
        <h2>Дни рождения</h2>
        {bdays.length === 0 && <Empty>Добавьте подруг с датами рождения, и приложение напомнит заранее.</Empty>}
        <div className="list">
          {bdays.slice(0, 6).map(({ f, days, date }) => (
            <button key={f.id} className="row" onClick={() => sheet.open(<FriendSheet friendId={f.id} />)}>
              <span className="tx">
                {f.name}
                <small>
                  {longDate(date)}, {inDays(days)}
                  {f.idea ? '. Идея: ' + f.idea : ''}
                </small>
              </span>
              {days <= 14 && <span className="pill">{GIFT_STEPS[f.gift || 0].toLowerCase()}</span>}
            </button>
          ))}
        </div>
      </section>

      <div className="btn-row">
        <button className="btn" onClick={() => sheet.open(<EventSheet />)}>
          Новая встреча
        </button>
      </div>

      {events.map((ev) => (
        <EventCard key={ev.id} ev={ev} />
      ))}
      {events.length === 0 && (
        <section className="card soft">
          <Empty>Запланируйте поход в баню, кафе или день рождения, и здесь появится чек-лист.</Empty>
        </section>
      )}

      <Split />

      {past.length > 0 && (
        <section className="card">
          <div className="card-h">
            <h2>Прошедшие встречи</h2>
            <EditToggle edit={edit} setEdit={setEdit} />
          </div>
          <div className="list">
            {past.map((e) => (
              <div className="static" key={e.id}>
                <div className="tx">
                  {e.t}
                  <small>{longDate(e.date)}</small>
                </div>
                {edit && <PastDel id={e.id} />}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function PastDel({ id }) {
  const { up } = useStore();
  return <DelBtn onClick={() => up((d) => void (d.events = d.events.filter((x) => x.id !== id)))} />;
}
