// Окно «Новая трата / Новый доход». Используется на главной и в разделе «Деньги».
import { useState } from 'react';
import { useStore } from '../store.jsx';
import { Sheet, Seg, useUi } from '../ui.jsx';
import { EXP_CATS, INC_CATS } from '../data.js';
import { today, uid } from '../util.js';

export function OpSheet({ type: initial = 'exp' }) {
  const { S, up } = useStore();
  const { sheet, toast } = useUi();
  const [type, setType] = useState(initial);
  const [cat, setCat] = useState(initial === 'exp' ? EXP_CATS[1] : INC_CATS[0]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today());

  const cats = type === 'exp' ? EXP_CATS : INC_CATS;

  function changeType(t) {
    setType(t);
    setCat(t === 'exp' ? EXP_CATS[1] : INC_CATS[0]);
  }

  function save() {
    const a = parseFloat(String(amount).replace(',', '.'));
    if (!(a > 0)) return toast('Введите сумму');
    up((d) => {
      d.ops.push({ id: uid(), type, cat, note: note.trim(), a, d: date || today() });
    });
    toast(type === 'exp' ? 'Трата сохранена' : 'Доход сохранён');
    sheet.close();
  }

  return (
    <Sheet title={type === 'exp' ? 'Новая трата' : 'Новый доход'}>
      <Seg
        items={[
          ['exp', 'Расход'],
          ['inc', 'Доход']
        ]}
        value={type}
        onChange={changeType}
      />
      <label className="lab" htmlFor="op-amt">
        Сумма, {S.cur}
      </label>
      <input className="in big" id="op-amt" type="number" inputMode="decimal" placeholder="0" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
      <span className="lab">{type === 'exp' ? 'Категория' : 'Источник'}</span>
      <div className="chips" style={{ marginTop: 8 }}>
        {cats.map((c) => (
          <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      <label className="lab" htmlFor="op-note">
        Комментарий
      </label>
      <input className="in" id="op-note" type="text" placeholder="Например, кофе" value={note} onChange={(e) => setNote(e.target.value)} />
      <label className="lab" htmlFor="op-date">
        Дата
      </label>
      <input className="in" id="op-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <button className="btn full" onClick={save}>
        {type === 'exp' ? 'Сохранить трату' : 'Сохранить доход'}
      </button>
    </Sheet>
  );
}

// Сумма расходов/доходов за месяц (prefix вида '2026-10')
export function monthTotals(ops, prefix) {
  let inc = 0,
    exp = 0;
  ops.forEach((o) => {
    if (!o.d.startsWith(prefix)) return;
    if (o.type === 'inc') inc += o.a;
    else exp += o.a;
  });
  return { inc, exp };
}
