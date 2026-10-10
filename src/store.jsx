// Хранилище данных. Всё лежит на устройстве (localStorage) и никуда не отправляется.
// Позже сюда можно добавить синхронизацию (например, Supabase), остальной код менять не придётся.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { defaults } from './data.js';

const KEY = 'planer-v1';
const Ctx = createContext(null);

// Поля, которые не синхронизируются между устройствами (у каждого устройства свои)
export const DEVICE_KEYS = ['pinHash', 'pinSalt', 'palette', 'mode'];

// Дополняет данные значениями по умолчанию (на случай, если в них чего-то не хватает)
export function normalize(o) {
  const base = defaults();
  return { ...base, ...o, mods: { ...base.mods, ...(o.mods || {}) }, cycle: { ...base.cycle, ...(o.cycle || {}) }, meno: { ...base.meno, ...(o.meno || {}) } };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) {
    /* если данные повреждены, начинаем с чистого листа */
  }
  return defaults();
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
      d._ts = Date.now(); // отметка времени последнего изменения (нужна для синхронизации)
      return d;
    });
  }, []);

  const reset = useCallback(() => setS(defaults()), []);
  // Заменяет все данные целиком (используется синхронизацией)
  const replaceAll = useCallback((fn) => setS((prev) => fn(prev)), []);

  return <Ctx.Provider value={{ S, up, reset, replaceAll }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

// PIN: хэш с солью. Это защита экрана от случайных глаз, а не шифрование данных.
export async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(salt + ':' + pin);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export const newSalt = () => Array.from(crypto.getRandomValues(new Uint8Array(8))).map((b) => b.toString(16).padStart(2, '0')).join('');
