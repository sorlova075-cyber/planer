// Синхронизация между устройствами через Supabase.
// Данные шифруются на устройстве паролем от аккаунта, в облаке лежит один зашифрованный набор.
// Правило: у каждого устройства своя копия, а облако помогает им обменяться изменениями.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { sb } from './supabase.js';
import { deriveKey, importKey, encryptJson, decryptJson, randomSalt } from './crypto.js';
import { useStore, normalize, DEVICE_KEYS } from './store.jsx';
import { Sheet, useUi } from './ui.jsx';

const META = 'planer-sync-meta';
const KEYSTORE = 'planer-sync-key';
const readJ = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null');
  } catch (e) {
    return null;
  }
};
const writeJ = (k, v) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {
    /* нет доступа к памяти: синхронизация продолжит работать в рамках сессии */
  }
};
const getMeta = () => ({ userId: null, lastRemote: null, syncedTs: 0, lastSyncAt: 0, ...(readJ(META) || {}) });
const setMeta = (p) => writeJ(META, { ...getMeta(), ...p });

const toDoc = (S) => {
  const d = structuredClone(S);
  DEVICE_KEYS.forEach((k) => delete d[k]);
  return d;
};

/* ---------- Объединение двух копий данных ---------- */
const union = (a = [], b = []) => {
  const m = new Map();
  [...a, ...b].forEach((x) => {
    if (!m.has(x.id)) m.set(x.id, x);
  });
  return [...m.values()];
};
const uniq = (a = [], b = []) => [...new Set([...(a || []), ...(b || [])])];
function mergeMap(a = {}, b = {}, fn) {
  const out = {};
  new Set([...Object.keys(a), ...Object.keys(b)]).forEach((k) => {
    out[k] = a[k] === undefined ? b[k] : b[k] === undefined ? a[k] : fn(a[k], b[k]);
  });
  return out;
}

export function mergeDocs(L, Rraw) {
  const R = normalize(Rraw);
  const [N, O] = (L._ts || 0) >= (R._ts || 0) ? [L, R] : [R, L]; // N: более новая копия
  const out = structuredClone(N);
  ['habits', 'reminders', 'care', 'ops', 'goals', 'friends', 'events'].forEach((k) => (out[k] = union(N[k], O[k])));
  out.routines = { am: union(N.routines.am, O.routines.am), pm: union(N.routines.pm, O.routines.pm) };
  out.habitLog = mergeMap(N.habitLog, O.habitLog, uniq);
  out.water = mergeMap(N.water, O.water, (a, b) => Math.max(a, b));
  out.sym = mergeMap(N.sym, O.sym, uniq);
  out.mood = { ...O.mood, ...N.mood };
  out.routineLog = mergeMap(N.routineLog, O.routineLog, (a, b) => ({ am: uniq(a.am, b.am), pm: uniq(a.pm, b.pm) }));
  out.limits = { ...O.limits, ...N.limits };
  out.meno = {
    hot: mergeMap(N.meno.hot, O.meno.hot, (a, b) => Math.max(a, b)),
    sleep: { ...O.meno.sleep, ...N.meno.sleep },
    sym: mergeMap(N.meno.sym, O.meno.sym, uniq)
  };
  DEVICE_KEYS.forEach((k) => (out[k] = L[k]));
  out._ts = Date.now();
  return out;
}

function authMessage(e) {
  const m = (e && e.message) || '';
  if (/Invalid path|Not Found|404|Invalid API key|Invalid URL/i.test(m)) return 'Приложение не может связаться с Supabase. Проверьте в Vercel переменную VITE_SUPABASE_URL: адрес должен выглядеть как https://xxxx.supabase.co, без пробелов, кавычек и лишних частей, а ключ VITE_SUPABASE_ANON_KEY должен быть публичным (sb_publishable_...). После исправления сделайте Redeploy.';
  if (/Invalid login credentials/i.test(m)) return 'Неверная почта или пароль.';
  if (/already registered/i.test(m)) return 'Такой аккаунт уже есть. Нажмите «Войти».';
  if (/at least 6/i.test(m)) return 'Пароль должен быть не короче 6 символов.';
  if (/valid email|invalid format|Unable to validate email/i.test(m)) return 'Проверьте адрес почты.';
  if (/rate limit/i.test(m)) return 'Слишком много попыток. Попробуйте чуть позже.';
  if (/fetch|network/i.test(m)) return 'Нет связи с сервером. Проверьте интернет.';
  return m || 'Что-то пошло не так.';
}

/* ---------- Контекст ---------- */
const Ctx = createContext(null);
export const useSync = () => useContext(Ctx);

function ConflictSheet() {
  const { resolve } = useSync();
  const { sheet } = useUi();
  const pick = (c) => {
    sheet.close();
    resolve(c);
  };
  return (
    <Sheet title="Данные отличаются">
      <p className="sub" style={{ marginTop: 4 }}>
        На этом устройстве и в облаке есть разные изменения. Что оставить?
      </p>
      <button className="btn full" onClick={() => pick('merge')}>
        Объединить (рекомендуется)
      </button>
      <p className="sub" style={{ marginTop: 8, fontSize: 13 }}>
        Сохранятся записи с обоих устройств. Удалённые ранее пункты могут вернуться.
      </p>
      <button className="btn full ghost" onClick={() => pick('local')}>
        Оставить данные этого устройства
      </button>
      <button className="btn full ghost" onClick={() => pick('remote')}>
        Взять данные из облака
      </button>
    </Sheet>
  );
}

export function SyncProvider({ children }) {
  const { S, replaceAll } = useStore();
  const { sheet } = useUi();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(sb ? 'idle' : 'off'); // off | idle | syncing | offline | error | conflict
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState(getMeta().lastSyncAt);
  const [conflict, setConflict] = useState(null);

  const Sref = useRef(S);
  Sref.current = S;
  const userRef = useRef(null);
  userRef.current = user;
  const conflictRef = useRef(null);
  conflictRef.current = conflict;
  const keyRef = useRef(null); // { salt, key }
  const running = useRef(false);
  const again = useRef(false);

  const adopt = useCallback(
    (R, remoteAt) => {
      replaceAll((prev) => {
        const n = normalize(R);
        DEVICE_KEYS.forEach((k) => (n[k] = prev[k]));
        return n;
      });
      setMeta({ lastRemote: remoteAt, syncedTs: R._ts || 0, lastSyncAt: Date.now() });
      setLastSync(Date.now());
    },
    [replaceAll]
  );

  async function push(doc, expected, u) {
    const { key, salt } = keyRef.current;
    const data = await encryptJson(key, doc);
    const now = new Date().toISOString();
    let res;
    if (expected === null) res = await sb.from('planer_data').insert({ user_id: u.id, data, salt, updated_at: now }).select('updated_at');
    else res = await sb.from('planer_data').update({ data, updated_at: now }).eq('user_id', u.id).eq('updated_at', expected).select('updated_at');
    if (res.error) {
      if (expected === null && res.error.code === '23505') return 'conflict';
      throw res.error;
    }
    if (!res.data || !res.data.length) return 'conflict';
    setMeta({ userId: u.id, lastRemote: res.data[0].updated_at, syncedTs: doc._ts || 0, lastSyncAt: Date.now() });
    setLastSync(Date.now());
    return 'ok';
  }

  const runSync = useCallback(async () => {
    const u = userRef.current;
    if (!sb || !u || !keyRef.current || conflictRef.current) return;
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    setStatus('syncing');
    setError('');
    try {
      do {
        again.current = false;
        const { data: row, error: e } = await sb.from('planer_data').select('data,salt,updated_at').eq('user_id', u.id).maybeSingle();
        if (e) throw e;
        const meta = getMeta();
        const local = Sref.current;
        const dirty = (local._ts || 0) > meta.syncedTs;

        if (!row) {
          if ((local._ts || 0) > 0) {
            const r = await push(toDoc(local), null, u);
            if (r === 'conflict') again.current = true;
          }
          continue;
        }
        if (row.salt !== keyRef.current.salt) throw new Error('KEY');
        if (row.updated_at === meta.lastRemote) {
          if (dirty) {
            const r = await push(toDoc(local), row.updated_at, u);
            if (r === 'conflict') again.current = true;
          }
          continue;
        }
        let R;
        try {
          R = await decryptJson(keyRef.current.key, row.data);
        } catch (err) {
          throw new Error('KEY');
        }
        if (!dirty || (local._ts || 0) === 0) {
          adopt(R, row.updated_at);
          continue;
        }
        setConflict({ R, remoteAt: row.updated_at });
        setStatus('conflict');
        return;
      } while (again.current);
      setStatus('idle');
    } catch (err) {
      if (err && err.message === 'KEY') {
        setError('Не удаётся расшифровать данные из облака. Если вы меняли пароль, войдите со старым паролем.');
        setStatus('error');
      } else if (!navigator.onLine || /fetch|network/i.test((err && err.message) || '')) {
        setStatus('offline');
      } else {
        setError(authMessage(err));
        setStatus('error');
      }
    } finally {
      running.current = false;
    }
  }, [adopt]);

  /* восстановление сессии при запуске */
  useEffect(() => {
    if (!sb) return undefined;
    let alive = true;
    sb.auth.getSession().then(async ({ data }) => {
      const sess = data && data.session;
      if (!sess || !alive) return;
      const k = readJ(KEYSTORE);
      if (!k) {
        await sb.auth.signOut();
        return;
      }
      keyRef.current = { salt: k.salt, key: await importKey(k.raw) };
      if (alive) setUser(sess.user);
    });
    const { data: sub } = sb.auth.onAuthStateChange((ev) => {
      if (ev === 'SIGNED_OUT') {
        setUser(null);
        keyRef.current = null;
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /* синхронизация: после любого изменения, при возвращении в приложение, при появлении сети и раз в минуту */
  useEffect(() => {
    if (!user || conflict) return undefined;
    const id = setTimeout(runSync, 2500);
    return () => clearTimeout(id);
  }, [S._ts, user, conflict, runSync]);

  useEffect(() => {
    if (!user) return undefined;
    runSync();
    const onVis = () => document.visibilityState === 'visible' && runSync();
    const onOnline = () => runSync();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('online', onOnline);
    const iv = setInterval(runSync, 60000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('online', onOnline);
      clearInterval(iv);
    };
  }, [user, runSync]);

  /* конфликт: сразу предлагаем выбрать */
  useEffect(() => {
    if (conflict) sheet.open(<ConflictSheet />);
  }, [conflict, sheet]);

  async function auth(email, password, create) {
    try {
      return await authInner(email, password, create);
    } catch (err) {
      return { ok: false, msg: authMessage(err) };
    }
  }

  async function authInner(email, password, create) {
    if (!sb) return { ok: false, msg: 'Синхронизация не настроена.' };
    const fn = create ? sb.auth.signUp({ email, password }) : sb.auth.signInWithPassword({ email, password });
    const { data, error: e } = await fn;
    if (e) return { ok: false, msg: authMessage(e) };
    const sess = data && data.session;
    if (!sess) return { ok: false, msg: 'Аккаунт создан. Подтвердите почту по ссылке из письма, затем нажмите «Войти».' };
    const { data: row, error: e2 } = await sb.from('planer_data').select('salt,data').eq('user_id', sess.user.id).maybeSingle();
    if (e2) {
      await sb.auth.signOut();
      return { ok: false, msg: 'Не удалось получить данные. Проверьте, что таблица создана (см. инструкцию).' };
    }
    const salt = row ? row.salt : randomSalt();
    const { key, raw } = await deriveKey(password, salt);
    if (row) {
      try {
        await decryptJson(key, row.data);
      } catch (err) {
        await sb.auth.signOut();
        return { ok: false, msg: 'Этот пароль не подходит к данным в облаке. Используйте пароль, с которым начинали синхронизацию.' };
      }
    }
    writeJ(KEYSTORE, { salt, raw });
    keyRef.current = { salt, key };
    const meta = getMeta();
    if (meta.userId !== sess.user.id) writeJ(META, { userId: sess.user.id, lastRemote: null, syncedTs: 0, lastSyncAt: 0 });
    setUser(sess.user);
    return { ok: true };
  }

  async function signOut() {
    if (sb) await sb.auth.signOut();
    writeJ(KEYSTORE, null);
    keyRef.current = null;
    setUser(null);
    setConflict(null);
    setStatus('idle');
  }

  async function deleteCloud() {
    const u = userRef.current;
    if (sb && u) await sb.from('planer_data').delete().eq('user_id', u.id);
    writeJ(META, null);
    await signOut();
  }

  const resolve = useCallback(
    async (choice) => {
      const c = conflictRef.current;
      const u = userRef.current;
      if (!c || !u) return;
      setConflict(null);
      conflictRef.current = null;
      setStatus('syncing');
      try {
        if (choice === 'remote') {
          adopt(c.R, c.remoteAt);
        } else {
          let doc;
          if (choice === 'merge') {
            const M = mergeDocs(Sref.current, c.R);
            replaceAll(() => M);
            doc = toDoc(M);
          } else {
            const L = { ...Sref.current, _ts: Date.now() };
            replaceAll(() => L);
            doc = toDoc(L);
          }
          const r = await push(doc, c.remoteAt, u);
          if (r === 'conflict') {
            setStatus('idle');
            runSync();
            return;
          }
        }
        setStatus('idle');
      } catch (err) {
        setError(authMessage(err));
        setStatus('error');
      }
    },
    [adopt, replaceAll, runSync]
  );

  return (
    <Ctx.Provider
      value={{
        available: !!sb,
        user,
        status,
        error,
        lastSync,
        conflict,
        auth,
        signOut,
        deleteCloud,
        syncNow: runSync,
        resolve,
        openConflict: () => sheet.open(<ConflictSheet />)
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
