// Настройки: имя, оформление, валюта, разделы, PIN, экспорт и удаление данных.
import { useState } from 'react';
import { useStore, hashPin, newSalt } from './store.jsx';
import { Icon, Sheet, Seg, Chip, useUi } from './ui.jsx';
import { MODS, PALS, CURRENCIES } from './data.js';

export function Header({ sub, title }) {
  const { sheet } = useUi();
  return (
    <header className="top">
      <div>
        <p className="date">{sub}</p>
        <h1>{title}</h1>
      </div>
      <button className="icon-btn" onClick={() => sheet.open(<SettingsSheet />)} aria-label="Настройки">
        <Icon n="settings" size={20} />
      </button>
    </header>
  );
}

function PinBlock() {
  const { S, up } = useStore();
  const { toast } = useUi();
  const [pin, setPin] = useState('');

  async function setNew() {
    if (pin.length !== 4) return toast('PIN должен состоять из 4 цифр');
    const salt = newSalt();
    const h = await hashPin(pin, salt);
    up((d) => {
      d.pinHash = h;
      d.pinSalt = salt;
    });
    setPin('');
    toast('PIN установлен');
  }
  function remove() {
    up((d) => {
      d.pinHash = null;
      d.pinSalt = null;
    });
    toast('PIN убран');
  }

  if (S.pinHash) {
    return (
      <>
        <p className="sub" style={{ marginTop: 8 }}>
          Вход по PIN включён. Это защита экрана от посторонних глаз, а не шифрование данных.
        </p>
        <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={remove}>
          Убрать PIN
        </button>
      </>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        className="in"
        type="password"
        inputMode="numeric"
        maxLength={4}
        placeholder="••••"
        aria-label="Новый PIN из 4 цифр"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
      />
      <button className="btn sm" style={{ marginTop: 8 }} onClick={setNew}>
        Установить
      </button>
    </div>
  );
}

function DataBlock({ onWipe }) {
  const { S } = useStore();
  const { toast } = useUi();
  const [confirm, setConfirm] = useState(false);

  function exportData() {
    try {
      const copy = { ...S, pinHash: null, pinSalt: null };
      const blob = new Blob([JSON.stringify(copy, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'planer-dannye.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast('Не удалось сохранить файл');
    }
  }

  return (
    <>
      <div className="btn-row">
        <button className="btn ghost" onClick={exportData}>
          Сохранить копию
        </button>
        <button className="btn ghost" onClick={() => setConfirm(true)}>
          Удалить всё
        </button>
      </div>
      {confirm && (
        <div className="result" style={{ marginTop: 12 }}>
          Все данные на этом устройстве будут стёрты без возможности восстановления.
          <div className="btn-row">
            <button className="btn ghost sm" onClick={() => setConfirm(false)}>
              Отмена
            </button>
            <button className="btn sm" onClick={onWipe}>
              Да, удалить
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function SettingsSheet() {
  const { S, up, reset } = useStore();
  const { sheet, setTab, toast } = useUi();

  function wipe() {
    reset();
    sheet.close();
    setTab('today');
    toast('Данные удалены');
  }

  return (
    <Sheet title="Настройки">
      <label className="lab" htmlFor="st-name">
        Имя
      </label>
      <input
        className="in"
        id="st-name"
        type="text"
        autoComplete="given-name"
        placeholder="Как к вам обращаться"
        value={S.name}
        onChange={(e) => up((d) => void (d.name = e.target.value))}
      />

      <span className="lab">Цвет</span>
      <div className="pals">
        {PALS.map((p) => (
          <button key={p[0]} className="pal" aria-pressed={S.palette === p[0]} onClick={() => up((d) => void (d.palette = p[0]))}>
            <span className="pv" style={{ background: p[2] }}>
              <i style={{ background: p[3] }} />
              <i style={{ background: p[4] }} />
              <i style={{ background: p[5] }} />
            </span>
            {p[1]}
          </button>
        ))}
      </div>

      <span className="lab">Режим</span>
      <Seg
        items={[
          ['light', 'Светлый'],
          ['dark', 'Тёмный'],
          ['auto', 'Как в системе']
        ]}
        value={S.mode}
        onChange={(v) => up((d) => void (d.mode = v))}
      />

      <span className="lab">Валюта</span>
      <div className="chips" style={{ marginTop: 8 }}>
        {CURRENCIES.map((c) => (
          <Chip key={c} on={S.cur === c} onClick={() => up((d) => void (d.cur = c))}>
            {c}
          </Chip>
        ))}
      </div>

      <span className="lab">Разделы</span>
      <div className="chips" style={{ marginTop: 8 }}>
        {MODS.map((m) => (
          <Chip key={m[0]} on={S.mods[m[0]]} onClick={() => up((d) => void (d.mods[m[0]] = !d.mods[m[0]]))}>
            {m[1]}
          </Chip>
        ))}
      </div>

      <span className="lab">PIN-код</span>
      <PinBlock />

      <span className="lab">Ваши данные</span>
      <p className="sub" style={{ marginTop: 6 }}>
        Всё хранится только на этом устройстве и никуда не отправляется.
      </p>
      <DataBlock onWipe={wipe} />
    </Sheet>
  );
}
