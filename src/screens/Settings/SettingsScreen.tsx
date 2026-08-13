import { useState } from 'react';
import { useI18n, type MsgKey } from '../../i18n';

type Theme = 'dark' | 'light';

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export default function SettingsScreen() {
  const { t, lang, setLang } = useI18n();
  const [theme, setTheme] = useState<Theme>(currentTheme);

  function applyTheme(next: Theme) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('aec-theme', next);
    } catch {
      /* private mode — theme chỉ sống trong phiên này */
    }
  }

  const placeholders: [MsgKey, string][] = [
    ['settingsVoice', 'Phase 1'],
    ['settingsAI', 'Phase 4'],
    ['settingsLearning', 'Phase 3'],
    ['settingsData', 'Phase 1'],
    ['settingsCredits', 'Phase 1'],
  ];

  return (
    <div>
      <h1 className="screen-title">{t('settingsTitle')}</h1>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3>{t('settingsAppearance')}</h3>
        <div className="hub-item">
          <span className="hub-item__label">{t('settingsTheme')}</span>
          <button
            className="badge-soon"
            onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? t('settingsThemeDark') : t('settingsThemeLight')} —{' '}
            {t('settingsThemeSwitch')}
          </button>
        </div>
        <div className="hub-item">
          <span className="hub-item__label">{t('settingsLanguage')}</span>
          <button className="badge-soon" onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}>
            {lang === 'vi' ? 'Tiếng Việt' : 'English'} — {t('settingsThemeSwitch')}
          </button>
        </div>
      </div>

      {placeholders.map(([label, phase]) => (
        <div key={label} className="card hub-item" style={{ marginBottom: 12 }} aria-disabled>
          <span className="hub-item__label">{t(label)}</span>
          <span className="badge-soon">{phase}</span>
        </div>
      ))}
    </div>
  );
}
