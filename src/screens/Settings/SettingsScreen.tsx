import { useEffect, useRef, useState } from 'react';
import { normalizeImported, parseImport, serialize } from '../../core/importExport';
import { getManifest, type BundleManifest } from '../../services/dataBundle';
import { download } from '../../services/download';
import { getSettings, saveSettings, type AppSettings } from '../../services/settings';
import { sortedVoices, speak } from '../../services/tts';
import { useDeck } from '../../hooks/useDeck';
import { useVoices } from '../../hooks/useVoices';
import { useI18n, type MsgKey } from '../../i18n';

type Theme = 'dark' | 'light';

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export default function SettingsScreen() {
  const { t, lang, setLang } = useI18n();
  const { deck, importCards, clearAll } = useDeck();
  const voices = useVoices();

  const [theme, setTheme] = useState<Theme>(currentTheme);
  const [settings, setSettings] = useState<AppSettings>(getSettings);
  const [manifest, setManifest] = useState<BundleManifest | null>(null);
  const [toast, setToast] = useState('');
  const restoreRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getManifest().then(setManifest);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  function applyTheme(next: Theme) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('aec-theme', next);
    } catch {
      /* private mode */
    }
  }

  function patch(p: Partial<AppSettings>) {
    setSettings(saveSettings(p));
  }

  async function restoreFile(file: File) {
    try {
      const parsed = parseImport(file.name, await file.text());
      if (parsed.length === 0) {
        showToast(t('deckImportFail'));
        return;
      }
      const { added, skipped } = await importCards(normalizeImported(parsed, Date.now()));
      showToast(t('deckImportDone', { added, skipped }));
    } catch {
      showToast(t('deckImportFail'));
    }
  }

  const enVoices = sortedVoices(voices, 'en').filter((v) =>
    v.lang.toLowerCase().startsWith('en'),
  );
  const viVoices = sortedVoices(voices, 'vi').filter((v) =>
    v.lang.toLowerCase().startsWith('vi'),
  );

  const voicePicker = (
    label: MsgKey,
    list: SpeechSynthesisVoice[],
    value: string,
    key: 'ttsVoiceEn' | 'ttsVoiceVi',
    testText: string,
    testLang: 'en' | 'vi',
  ) => (
    <div className="field">
      <label>{t(label)}</label>
      <div className="row">
        <select
          className="input"
          value={value}
          onChange={(e) => patch({ [key]: e.target.value } as Partial<AppSettings>)}
        >
          <option value="">{t('settingsVoiceAuto')}</option>
          {list.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
        <button className="btn" onClick={() => speak(testText, testLang)}>
          {t('settingsVoiceTest')}
        </button>
      </div>
    </div>
  );

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

      <div className="card" style={{ marginBottom: 12 }}>
        <h3>{t('settingsVoice')}</h3>
        {voicePicker(
          'settingsVoiceEn',
          enVoices,
          settings.ttsVoiceEn,
          'ttsVoiceEn',
          'Practice makes perfect.',
          'en',
        )}
        {voicePicker(
          'settingsVoiceVi',
          viVoices,
          settings.ttsVoiceVi,
          'ttsVoiceVi',
          'Có công mài sắt, có ngày nên kim.',
          'vi',
        )}
        <div className="field">
          <label>
            {t('settingsRate')}: <span className="tabular">{settings.ttsRate.toFixed(2)}×</span>
          </label>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={settings.ttsRate}
            onChange={(e) => patch({ ttsRate: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3>{t('settingsData')}</h3>
        <p className="text-2 tabular" style={{ marginTop: 0 }}>
          {t('deckCards', { n: deck.length })}
        </p>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <button
            className="btn"
            disabled={deck.length === 0}
            onClick={() => download('aec-backup.json', serialize(deck, 'json'), 'application/json')}
          >
            {t('settingsBackup')}
          </button>
          <button className="btn" onClick={() => restoreRef.current?.click()}>
            {t('settingsRestore')}
          </button>
          <input
            ref={restoreRef}
            type="file"
            accept=".csv,.tsv,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void restoreFile(f);
              e.target.value = '';
            }}
          />
          <button
            className="btn btn--danger"
            disabled={deck.length === 0}
            onClick={() => {
              if (window.confirm(t('settingsClearConfirm', { n: deck.length }))) {
                void clearAll().then(() => showToast(t('toastDeleted')));
              }
            }}
          >
            {t('settingsClear')}
          </button>
        </div>
      </div>

      {(
        [
          ['settingsAI', 'Phase 4'],
          ['settingsLearning', 'Phase 3'],
        ] as [MsgKey, string][]
      ).map(([label, phase]) => (
        <div key={label} className="card hub-item" style={{ marginBottom: 12 }} aria-disabled>
          <span className="hub-item__label">{t(label)}</span>
          <span className="badge-soon">{phase}</span>
        </div>
      ))}

      <details className="card" style={{ marginBottom: 12 }}>
        <summary style={{ fontWeight: 600, cursor: 'pointer' }}>{t('settingsCredits')}</summary>
        <p className="text-2">{t('settingsCreditsIntro')}</p>
        <ul className="text-2" style={{ fontSize: 13, paddingLeft: 18 }}>
          {(
            manifest?.sources ?? [
              { name: 'Tatoeba', url: 'https://tatoeba.org', license: 'CC-BY 2.0 FR' },
              {
                name: 'NGSL (Browne, Culligan & Phillips)',
                url: 'https://www.newgeneralservicelist.com',
                license: 'CC BY-SA 4.0',
              },
              {
                name: 'CMUdict-IPA',
                url: 'https://github.com/menelik3/cmudict-ipa',
                license: 'BSD',
              },
            ]
          ).map((s) => (
            <li key={s.name}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.name}
              </a>{' '}
              — {s.license}
            </li>
          ))}
          <li>
            <a href="https://dictionaryapi.dev" target="_blank" rel="noreferrer">
              Free Dictionary API
            </a>{' '}
            — Wiktionary (CC BY-SA)
          </li>
          <li>
            Font:{' '}
            <a href="https://fonts.google.com/specimen/Be+Vietnam+Pro" target="_blank" rel="noreferrer">
              Be Vietnam Pro
            </a>{' '}
            — OFL
          </li>
        </ul>
      </details>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
