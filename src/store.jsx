// Хранилище данных. Всё лежит на устройстве (localStorage) и никуда не отправляется.
// Позже сюда можно добавить синхронизацию (например, Supabase), остальной код менять не придётся.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { defaults } from './data.js';

const KEY = 'planer-v1';
const Ctx = createContext(null);

function load() {
  const base = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw);
      return { ...base, ...o, mods: { ...base.mods, ...(o.mods || {}) }, cycle: { ...base.cycle, ...(o.cycle || {}) } };
    }
  } catch (e) {
    /* если данные повреждены, начинаем с чистого листа */
  }
  return base;
}

export function StoreProvider({ children }) {
  const [S, setS] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {
      /* память переполнена или запрещена: приложение продолжит работать без сохранения */
    }
  }, [S]);

  // up(draft => { draft.name = 'Аня' }) меняет копию данных и сохраняет её
  const up = useCallback((fn) => {
    setS((prev) => {
      const d = structuredClone(prev);
      fn(d);
      return d;
    });
  }, []);

  const reset = useCallback(() => setS(defaults()), []);

  return <Ctx.Provider value={{ S, up, reset }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

// PIN: хэш с солью. Это защита экрана от случайных глаз, а не шифрование данных.
export async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(salt + ':' + pin);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export const newSalt = () => Array.from(crypto.getRandomValues(new Uint8Array(8))).map((b) => b.toString(16).padStart(2, '0')).join('');
