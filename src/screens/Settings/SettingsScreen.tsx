import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { normalizeImported, parseImport, serialize } from '../../core/importExport';
import { PROVIDER_DEFAULT_MODEL, validateKey } from '../../services/ai/client';
import { getManifest, type BundleManifest } from '../../services/dataBundle';
import { download } from '../../services/download';
import { getSettings, saveSettings, type AppSettings } from '../../services/settings';
import { disablePush, enablePush, isPushEnabled, pushConfigured, pushSupported, type EnableResult } from '../../services/push';
import { getSession, signIn, signOut, signUp } from '../../services/supabase';
import { lastSyncedAt, syncNow } from '../../services/sync';
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

  // Sync
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [syncMsg, setSyncMsg] = useState('');
  const [syncBusy, setSyncBusy] = useState(false);

  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    void getManifest().then(setManifest);
    void getSession().then(setSession);
    void isPushEnabled().then(setPushOn);
  }, []);

  async function togglePush() {
    setPushBusy(true);
    try {
      if (pushOn) {
        await disablePush();
        setPushOn(false);
      } else {
        const r = await enablePush(settings.reminderHour);
        setPushOn(r === 'ok');
        const map: Record<EnableResult, string> = {
          ok: t('remindEnabled'),
          unsupported: t('remindUnsupported'),
          'no-vapid': t('remindNoVapid'),
          'signed-out': t('remindSignIn'),
          denied: t('remindDenied'),
          error: t('syncError', { msg: '?' }),
        };
        showToast(map[r]);
      }
    } finally {
      setPushBusy(false);
    }
  }

  async function runSync() {
    setSyncBusy(true);
    const r = await syncNow();
    setSyncBusy(false);
    if (r.status === 'ok') {
      setSyncMsg(t('syncDone', { pulled: r.pulled ?? 0, pushed: r.pushed ?? 0 }));
    } else if (r.status === 'error') {
      setSyncMsg(t('syncError', { msg: r.message ?? '?' }));
    }
  }

  async function handleSignIn() {
    setSyncBusy(true);
    setSyncMsg('');
    const err = await signIn(email.trim(), password);
    if (err) {
      setSyncMsg(err);
      setSyncBusy(false);
      return;
    }
    setSession(await getSession());
    setSyncBusy(false);
    void runSync();
  }

  async function handleSignUp() {
    setSyncBusy(true);
    setSyncMsg('');
    const err = await signUp(email.trim(), password);
    setSyncBusy(false);
    if (err) {
      setSyncMsg(err);
      return;
    }
    const s = await getSession();
    setSession(s);
    // Nếu project bật "Confirm email" thì chưa có session ngay
    if (!s) setSyncMsg(t('syncConfirmEmail'));
    else void runSync();
  }

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

      <div className="card" style={{ marginBottom: 12 }}>
        <h3>{t('syncTitle')}</h3>
        {session ? (
          <>
            <p className="text-2" style={{ marginTop: 0 }}>
              {t('syncedAs', { email: session.user.email ?? '' })}
              <br />
              {(() => {
                const at = lastSyncedAt(session.user.id);
                return at ? t('syncLast', { time: new Date(at).toLocaleString() }) : t('syncNever');
              })()}
            </p>
            <div className="toolbar" style={{ marginBottom: 0 }}>
              <button className="btn" onClick={() => void runSync()} disabled={syncBusy}>
                {syncBusy ? '…' : t('syncNowBtn')}
              </button>
              <button
                className="btn"
                onClick={() => {
                  void signOut().then(() => setSession(null));
                }}
              >
                {t('syncSignOut')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-2" style={{ marginTop: 0 }}>
              {t('syncHint')}
            </p>
            <div className="field">
              <label>{t('syncEmail')}</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label>{t('syncPassword')}</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="row">
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={() => void handleSignIn()}
                disabled={syncBusy || !email.trim() || password.length < 6}
              >
                {t('syncSignIn')}
              </button>
              <button
                className="btn"
                onClick={() => void handleSignUp()}
                disabled={syncBusy || !email.trim() || password.length < 6}
              >
                {t('syncSignUp')}
              </button>
            </div>
          </>
        )}
        {syncMsg && (
          <p className="text-2" style={{ fontSize: 13, marginBottom: 0 }}>
            {syncMsg}
          </p>
        )}
      </div>

      {pushSupported() && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3>{t('remindTitle')}</h3>
          {!session ? (
            <p className="text-2" style={{ margin: 0 }}>{t('remindSignIn')}</p>
          ) : !pushConfigured() ? (
            <p className="text-2" style={{ margin: 0 }}>{t('remindNoVapid')}</p>
          ) : (
            <>
              <div className="hub-item">
                <span className="hub-item__label">{t('remindHour')}</span>
                <select
                  className="input"
                  style={{ width: 'auto' }}
                  value={settings.reminderHour}
                  onChange={(e) => patch({ reminderHour: Number(e.target.value) })}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn" onClick={() => void togglePush()} disabled={pushBusy}>
                {pushBusy ? '…' : pushOn ? t('remindOff') : t('remindOn')}
              </button>
              <p className="text-2" style={{ fontSize: 12, marginBottom: 0 }}>
                {t('remindHint')}
              </p>
            </>
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: 12 }}>
        <h3>{t('settingsAiTitle')}</h3>
        <p className="text-2" style={{ marginTop: 0, fontSize: 13 }}>
          {t('settingsAiHint')}
        </p>
        <div className="field">
          <label>{t('settingsAiProvider')}</label>
          <select
            className="input"
            value={settings.aiProvider}
            onChange={(e) =>
              patch({ aiProvider: e.target.value as AppSettings['aiProvider'], aiKey: '' })
            }
          >
            <option value="gemini">Google Gemini</option>
            <option value="groq">Groq</option>
            <option value="openrouter">OpenRouter</option>
            <option value="openai">OpenAI / tự host</option>
          </select>
        </div>
        <div className="field">
          <label>API key</label>
          <input
            className="input"
            type="password"
            value={settings.aiKey}
            onChange={(e) => patch({ aiKey: e.target.value.trim() })}
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label>{t('settingsAiModel')}</label>
          <input
            className="input"
            value={settings.aiModel}
            onChange={(e) => patch({ aiModel: e.target.value })}
            placeholder={PROVIDER_DEFAULT_MODEL[settings.aiProvider]}
          />
        </div>
        {settings.aiProvider === 'openai' && (
          <div className="field">
            <label>Base URL</label>
            <input
              className="input"
              value={settings.aiBaseUrl}
              onChange={(e) => patch({ aiBaseUrl: e.target.value.trim() })}
              placeholder="https://api.openai.com/v1"
            />
          </div>
        )}
        <button
          className="btn"
          disabled={!settings.aiKey || syncBusy}
          onClick={() => {
            setSyncBusy(true);
            void validateKey().then((ok) => {
              setSyncBusy(false);
              showToast(ok ? t('settingsAiKeyOk') : t('settingsAiKeyBad'));
            });
          }}
        >
          {t('settingsAiValidate')}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3>{t('settingsLearningTitle')}</h3>
        <div className="hub-item">
          <span className="hub-item__label">{t('settingsDailyGoal')}</span>
          <input
            className="input"
            type="number"
            min={5}
            max={200}
            step={5}
            style={{ width: 90 }}
            value={settings.dailyGoal}
            onChange={(e) => patch({ dailyGoal: Math.max(1, Number(e.target.value) || 10) })}
          />
        </div>
        <div className="hub-item">
          <span className="hub-item__label">
            {t('settingsLevel')}:{' '}
            <b>{t(`level_${settings.practiceLevel}` as MsgKey)}</b>
          </span>
          <Link to="/vocabtest" className="badge-soon">
            {t('settingsVocabTest')}
          </Link>
        </div>
      </div>

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
