// Общие элементы интерфейса: иконки, окно-«шторка», уведомление, строки со списком.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const PATHS = {
  today: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  health: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  beauty: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  money: '<rect x="3" y="6" width="18" height="13" rx="3.5"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.2"/>',
  life: '<circle cx="9" cy="9" r="3"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><circle cx="17" cy="10" r="2.4"/><path d="M16 14.2c2.6-.3 4.5 1.5 4.5 4.3"/>',
  tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="3"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  meno: '<path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-2 1-3 1.5-4 .5 2 1.5 2.5 2.5 2.5C12.5 8 11 6 12 3z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  drop: '<path d="M12 3s6 6.2 6 10.5a6 6 0 0 1-12 0C6 9.2 12 3 12 3z"/>',
  smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14c1 1.5 2.2 2.2 3.5 2.2s2.5-.7 3.5-2.2"/><path d="M9.5 9.8h.01M14.5 9.8h.01"/>',
  cycle: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="4" r="1.7" fill="currentColor"/><circle cx="18.5" cy="15.5" r="1.2" fill="currentColor"/>',
  habit: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.4 2.4 4.6-5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
  edit: '<path d="M5 19l1-4L16.5 4.5a1.8 1.8 0 0 1 2.5 2.5L8.5 17.5z"/>'
};

export function Icon({ n, size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: PATHS[n] || '' }}
    />
  );
}

/* ---------- Контекст интерфейса: вкладка, шторка, уведомление ---------- */
const UiCtx = createContext(null);

export function UiProvider({ children }) {
  const [tab, setTab] = useState('today');
  const [sheetNode, setSheetNode] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const timer = useRef();

  const toast = useCallback((m) => {
    setToastMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(null), 2200);
  }, []);

  const sheet = useRef({
    open: (node) => setSheetNode(node),
    close: () => setSheetNode(null)
  }).current;

  return <UiCtx.Provider value={{ tab, setTab, sheet, sheetNode, toastMsg, toast }}>{children}</UiCtx.Provider>;
}

export const useUi = () => useContext(UiCtx);

/* ---------- Шторка (нижнее окно) ---------- */
export function Sheet({ title, children }) {
  const { sheet } = useUi();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && sheet.close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheet]);
  return (
    <div className="sheet" role="dialog" aria-label={title}>
      <div className="sheet-h">
        <h2>{title}</h2>
        <button className="icon-btn" onClick={sheet.close} aria-label="Закрыть">
          <Icon n="close" size={20} />
        </button>
      </div>
      {children}
    </div>
  );
}

/* ---------- Мелкие элементы ---------- */
export function CheckRow({ done, onClick, text, small }) {
  return (
    <button className={'row' + (done ? ' done' : '')} role="checkbox" aria-checked={done} onClick={onClick}>
      <span className="check">
        <Icon n="tick" size={16} />
      </span>
      <span className="tx">
        {text}
        {small ? <small>{small}</small> : null}
      </span>
    </button>
  );
}

export function Progress({ done, total, cls = '' }) {
  const p = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="prog">
      <div className={'bar ' + cls}>
        <i style={{ width: p + '%' }} />
      </div>
      <span>
        {done} из {total}
      </span>
    </div>
  );
}

export function Chip({ on, onClick, children }) {
  return (
    <button className="chip" aria-pressed={!!on} onClick={onClick}>
      {children}
    </button>
  );
}

export function Seg({ items, value, onChange }) {
  return (
    <div className="seg">
      {items.map(([k, label]) => (
        <button key={k} aria-pressed={value === k} onClick={() => onChange(k)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ on, onClick, label }) {
  return <button className="sw" role="switch" aria-checked={on} aria-label={label} onClick={onClick} />;
}

// Кнопка «Изменить» и крестик удаления для списков
export function EditToggle({ edit, setEdit }) {
  return (
    <button className="btn ghost sm" onClick={() => setEdit(!edit)}>
      {edit ? 'Готово' : 'Изменить'}
    </button>
  );
}
export function DelBtn({ onClick, label = 'Удалить' }) {
  return (
    <button className="icon-btn del" onClick={onClick} aria-label={label}>
      <Icon n="trash" size={18} />
    </button>
  );
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>;
}

export function Field({ label, id, children }) {
  return (
    <>
      <label className="lab" htmlFor={id}>
        {label}
      </label>
      {children}
    </>
  );
}
