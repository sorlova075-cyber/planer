// Корень приложения: тема, блокировка, знакомство, навигация по разделам.
import { useEffect, useState } from 'react';
import { StoreProvider, useStore } from './store.jsx';
import { UiProvider, useUi, Icon } from './ui.jsx';
import { Lock, Onboarding } from './Onboarding.jsx';
import Today from './screens/Today.jsx';
import Health from './screens/Health.jsx';
import Beauty from './screens/Beauty.jsx';
import Money from './screens/Money.jsx';
import Life from './screens/Life.jsx';
import Menopause from './screens/Menopause.jsx';

const TABS = [
  ['today', 'Сегодня', 'today'],
  ['health', 'Здоровье', 'health'],
  ['beauty', 'Красота', 'beauty'],
  ['money', 'Деньги', 'money'],
  ['life', 'Жизнь', 'life'],
  ['meno', 'Менопауза', 'meno']
];
const SCREENS = { today: Today, health: Health, beauty: Beauty, money: Money, life: Life, meno: Menopause };

function tabVisible(k, M) {
  if (k === 'today') return true;
  if (k === 'health') return M.cycle || M.health;
  if (k === 'beauty') return M.beauty;
  if (k === 'money') return M.money;
  if (k === 'life') return M.life;
  if (k === 'meno') return M.meno;
  return true;
}

// Маленький цветок для боковой панели на компьютере
function MiniPetals() {
  return (
    <svg viewBox="0 0 300 300" width="30" height="30">
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <ellipse key={k} cx="150" cy="92" rx="40" ry="72" fill={k % 2 ? 'var(--lilac)' : 'var(--rose)'} opacity=".75" transform={`rotate(${k * 60} 150 150)`} />
      ))}
      <circle cx="150" cy="150" r="26" fill="var(--surface)" />
      <circle cx="150" cy="150" r="9" fill="var(--plum)" />
    </svg>
  );
}

function Shell() {
  const { S } = useStore();
  const { tab, setTab, sheetNode, sheet, toastMsg } = useUi();
  const [unlocked, setUnlocked] = useState(false);

  // Применяем цвет и режим оформления
  useEffect(() => {
    const r = document.documentElement;
    if (S.palette === 'powder') r.removeAttribute('data-palette');
    else r.setAttribute('data-palette', S.palette);
    if (S.mode === 'auto') r.removeAttribute('data-theme');
    else r.setAttribute('data-theme', S.mode);
  }, [S.palette, S.mode]);

  // Если раздел скрыли в настройках, возвращаемся на главную
  useEffect(() => {
    if (!tabVisible(tab, S.mods)) setTab('today');
  }, [tab, S.mods, setTab]);

  const locked = S.pinHash && !unlocked;
  const main = locked ? <Lock onUnlock={() => setUnlocked(true)} /> : !S.onboarded ? <Onboarding /> : null;
  const Screen = SCREENS[tabVisible(tab, S.mods) ? tab : 'today'];

  return (
    <div id="app">
      <main id="main" key={locked ? 'lock' : S.onboarded ? tab : 'onb'}>
        {main || <Screen />}
      </main>

      {!main && (
        <nav aria-label="Разделы">
          <div className="brand" aria-hidden="true">
            <MiniPetals />
            Планер
          </div>
          {TABS.filter((t) => tabVisible(t[0], S.mods)).map(([k, label, icon]) => (
            <button key={k} aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}>
              <Icon n={icon} size={24} />
              {k === 'health' && S.mods.cycle && !S.mods.health ? 'Цикл' : label}
            </button>
          ))}
        </nav>
      )}

      {sheetNode && !main && (
        <div className="scrim" onClick={(e) => e.target === e.currentTarget && sheet.close()}>
          {sheetNode}
        </div>
      )}
      {toastMsg && (
        <div className="toast" role="status">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <UiProvider>
        <Shell />
      </UiProvider>
    </StoreProvider>
  );
}
