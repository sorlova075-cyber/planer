// Экран блокировки по PIN и знакомство при первом запуске.
import { useState } from 'react';
import { useStore, hashPin, newSalt } from './store.jsx';
import { Icon, Switch, useUi } from './ui.jsx';
import { MODS } from './data.js';
import { today } from './util.js';

export function Petals() {
  return (
    <div className="petals">
      <svg viewBox="0 0 300 300" width="250" height="250" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <ellipse
            key={k}
            cx="150"
            cy="92"
            rx="40"
            ry="72"
            fill={k % 2 ? 'var(--lilac)' : 'var(--rose)'}
            opacity=".72"
            transform={`rotate(${k * 60} 150 150)`}
          />
        ))}
        <circle cx="150" cy="150" r="30" fill="var(--surface)" />
        <circle cx="150" cy="150" r="10" fill="var(--plum)" />
      </svg>
    </div>
  );
}

export function Lock({ onUnlock }) {
  const { S, reset } = useStore();
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);
  const [forgot, setForgot] = useState(false);

  async function change(v) {
    const val = v.replace(/\D/g, '').slice(0, 4);
    setPin(val);
    setErr(false);
    if (val.length === 4) {
      const h = await hashPin(val, S.pinSalt);
      if (h === S.pinHash) onUnlock();
      else {
        setErr(true);
        setPin('');
      }
    }
  }

  return (
    <div className="onb">
      <div className="onb-art" style={{ marginTop: 30 }}>
        <Petals />
      </div>
      <h1>Введите PIN</h1>
      <p className="sub">{err ? 'Неверный PIN, попробуйте ещё раз.' : 'Ваши данные закрыты от посторонних.'}</p>
      <input
        className="in big"
        style={{ textAlign: 'center', letterSpacing: '0.4em', marginTop: 18 }}
        type="password"
        inputMode="numeric"
        maxLength={4}
        autoFocus
        aria-label="PIN из 4 цифр"
        value={pin}
        onChange={(e) => change(e.target.value)}
      />
      <div className="grow" />
      {forgot ? (
        <div className="result">
          Если забыли PIN, единственный способ войти: стереть данные на этом устройстве.
          <div className="btn-row">
            <button className="btn ghost sm" onClick={() => setForgot(false)}>
              Назад
            </button>
            <button
              className="btn sm"
              onClick={() => {
                reset();
                onUnlock();
              }}
            >
              Стереть данные
            </button>
          </div>
        </div>
      ) : (
        <button className="btn ghost full" onClick={() => setForgot(true)}>
          Забыли PIN?
        </button>
      )}
    </div>
  );
}

export function Onboarding() {
  const { S, up } = useStore();
  const { setTab, toast } = useUi();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(S.name);
  const [pinOn, setPinOn] = useState(false);
  const [pin, setPin] = useState('');
  const [mods, setMods] = useState({ ...S.mods });
  const [last, setLast] = useState('');
  const [len, setLen] = useState(28);

  const steps = mods.cycle ? 4 : 3;
  const isLast = step === (mods.cycle ? 3 : 2);

  async function finish(skipCycle) {
    let hash = null,
      salt = null;
    if (pinOn) {
      salt = newSalt();
      hash = await hashPin(pin, salt);
    }
    up((d) => {
      d.onboarded = true;
      d.name = name.trim();
      d.mods = mods;
      if (hash) {
        d.pinHash = hash;
        d.pinSalt = salt;
      }
      if (mods.cycle && last && !skipCycle) {
        d.cycle.last = last;
        d.cycle.len = Math.min(45, Math.max(21, Number(len) || 28));
      }
    });
    setTab('today');
  }

  function next() {
    if (step === 1 && pinOn && pin.length !== 4) return toast('PIN должен состоять из 4 цифр');
    if (step === 2 && !Object.values(mods).some(Boolean)) return toast('Выберите хотя бы один раздел');
    if (isLast) return finish();
    setStep(step + 1);
  }

  const dots = (
    <div className="dots" aria-hidden="true">
      {Array.from({ length: steps }).map((_, i) => (
        <i key={i} className={i === step ? 'on' : ''} />
      ))}
    </div>
  );
  const back = (
    <button className="icon-btn" onClick={() => setStep(step - 1)} aria-label="Назад">
      <Icon n="back" size={20} />
    </button>
  );

  if (step === 0) {
    return (
      <div className="onb">
        <div className="onb-art">
          <Petals />
        </div>
        <h1>Ваш день в одном спокойном месте</h1>
        <p className="sub">Цикл, здоровье, уход, деньги и встречи с подругами. Все данные остаются на вашем телефоне.</p>
        <div className="grow" />
        <button className="btn full" onClick={next}>
          Начать
        </button>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="onb">
        <div className="onb-top">
          {back}
          {dots}
          <span style={{ width: 42 }} />
        </div>
        <h1>Как к вам обращаться?</h1>
        <p className="sub">Имя нужно только для приветствия. Его видите только вы.</p>
        <label className="lab" htmlFor="ob-name">
          Ваше имя
        </label>
        <input className="in" id="ob-name" type="text" autoComplete="given-name" placeholder="Например, Аня" value={name} onChange={(e) => setName(e.target.value)} />
        <section className="card soft" style={{ marginTop: 18 }}>
          <div className="static" style={{ paddingTop: 0 }}>
            <div className="tx">
              Защитить вход PIN-кодом
              <small>Внутри личные данные, лучше закрыть их</small>
            </div>
            <Switch on={pinOn} label="PIN-код" onClick={() => setPinOn(!pinOn)} />
          </div>
          {pinOn && (
            <>
              <label className="lab" htmlFor="ob-pin" style={{ marginTop: 4 }}>
                PIN из 4 цифр
              </label>
              <input
                className="in"
                id="ob-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
              <p className="sub" style={{ marginTop: 8, fontSize: 13 }}>
                PIN хранится только на этом устройстве.
              </p>
            </>
          )}
        </section>
        <div className="grow" />
        <button className="btn full" onClick={next}>
          Дальше
        </button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="onb">
        <div className="onb-top">
          {back}
          {dots}
          <span style={{ width: 42 }} />
        </div>
        <h1>Что вам нужно?</h1>
        <p className="sub">Включите только то, чем будете пользоваться. Остальное скроется, а вернуть можно в любой момент в настройках.</p>
        <div className="mods">
          {MODS.map((m) => (
            <button key={m[0]} className="mod" aria-pressed={!!mods[m[0]]} onClick={() => setMods({ ...mods, [m[0]]: !mods[m[0]] })}>
              <span className="mchk">
                <Icon n="tick" size={14} />
              </span>
              <span className="mi">
                <Icon n={m[3]} size={22} />
              </span>
              <b>{m[1]}</b>
              <small>{m[2]}</small>
            </button>
          ))}
        </div>
        <div className="grow" />
        <button className="btn full" onClick={next}>
          {isLast ? 'Войти в приложение' : 'Дальше'}
        </button>
      </div>
    );
  }

  // шаг 3: цикл (только если выбран раздел «Цикл»)
  return (
    <div className="onb">
      <div className="onb-top">
        {back}
        {dots}
        <span style={{ width: 42 }} />
      </div>
      <h1>Когда начались последние месячные?</h1>
      <p className="sub">Так приложение построит прогноз. Можно пропустить и отметить позже.</p>
      <label className="lab" htmlFor="ob-last">
        Первый день последних месячных
      </label>
      <input className="in" id="ob-last" type="date" max={today()} value={last} onChange={(e) => setLast(e.target.value)} />
      <label className="lab" htmlFor="ob-len">
        Обычная длина цикла, дней
      </label>
      <input className="in" id="ob-len" type="number" inputMode="numeric" min="21" max="45" value={len} onChange={(e) => setLen(e.target.value)} />
      <div className="grow" />
      <button className="btn full" onClick={next}>
        Войти в приложение
      </button>
      <button className="btn ghost full" onClick={() => finish(true)}>
        Пропустить
      </button>
    </div>
  );
}
