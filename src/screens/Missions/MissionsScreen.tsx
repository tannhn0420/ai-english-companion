import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fromProofread } from '../../core/mistakes';
import { SCENARIOS } from '../../core/scenarios';
import type { ChatMessage, MissionResult, Scenario } from '../../core/types';
import { hasAiKey } from '../../services/ai/client';
import { assessMission, conversationTurn } from '../../services/ai/conversation';
import { recordSession } from '../../services/gamify';
import { recordMistakes } from '../../services/mistakes';
import { listenOnce, sttAvailable } from '../../services/stt';
import { speak } from '../../services/tts';
import { useI18n } from '../../i18n';

export default function MissionsScreen() {
  const { t } = useI18n();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [goalsMet, setGoalsMet] = useState<number[]>([]);
  const [hint, setHint] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<MissionResult | null>(null);
  const [msg, setMsg] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const stt = sttAvailable();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, result]);

  function begin(s: Scenario) {
    setScenario(s);
    setMessages([{ role: 'assistant', text: s.opener }]);
    setGoalsMet([]);
    setHint('');
    setInput('');
    setResult(null);
    setMsg('');
    setTimeout(() => speak(s.opener, 'en'), 200);
  }

  async function send(text: string) {
    if (!scenario || !text.trim() || busy) return;
    const next = [...messages, { role: 'user' as const, text: text.trim() }];
    setMessages(next);
    setInput('');
    setHint('');
    setBusy(true);
    try {
      const r = await conversationTurn(scenario, next);
      setMessages((m) => [...m, { role: 'assistant', text: r.reply }]);
      setGoalsMet(r.goalsMet);
      if (r.hint) setHint(r.hint);
      speak(r.reply, 'en');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function speakInput() {
    if (listening) return;
    setListening(true);
    try {
      const { promise } = listenOnce('en', setInput);
      const text = await promise;
      if (text) void send(text);
    } catch {
      setMsg(t('spkMicErr'));
    } finally {
      setListening(false);
    }
  }

  async function endMission() {
    if (!scenario || busy) return;
    setBusy(true);
    setMsg('');
    try {
      const r = await assessMission(scenario, messages);
      setResult(r);
      if (r.issues.length) void recordMistakes(fromProofread(r.issues, Date.now()));
      void recordSession({ total: 1, correct: r.completed ? 1 : 0 }, Date.now());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // ---- PICK ----
  if (!scenario) {
    return (
      <div>
        <h1 className="screen-title">{t('practiceMissions')}</h1>
        {!hasAiKey() && (
          <div className="card" style={{ marginBottom: 12 }}>
            <p className="text-2" style={{ margin: 0 }}>
              {t('practiceNeedKey')} <Link to="/settings">{t('tabSettings')} →</Link>
            </p>
          </div>
        )}
        <p className="text-2">{t('missHint')}</p>
        <div className="hub-list">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              className="card hub-item"
              onClick={() => begin(s)}
              disabled={!hasAiKey()}
              style={{ textAlign: 'left' }}
            >
              <span aria-hidden style={{ fontSize: 22 }}>{s.emoji}</span>
              <span className="hub-item__label">
                <span className="deck-row__term">{s.title}</span>
                <div className="deck-row__meaning">{s.context}</div>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---- RESULT ----
  if (result) {
    return (
      <div>
        <div className="card" style={{ textAlign: 'center', marginBottom: 12 }}>
          <p className="hero-line">
            <span className="hl">{result.completed ? t('missDone') : t('missPartial')}</span>
          </p>
          <p className="tabular" style={{ fontWeight: 800, fontSize: 22 }}>{result.score}/100</p>
          <p className="text-2" style={{ textAlign: 'left' }}>{result.feedback}</p>
        </div>
        {result.better.length > 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <b>{t('missBetter')}</b>
            {result.better.map((b, i) => (
              <p key={i} style={{ margin: '6px 0 0' }}>
                💬 {b}{' '}
                <button onClick={() => speak(b, 'en')} aria-label={t('listen')}>🔊</button>
              </p>
            ))}
          </div>
        )}
        {result.issues.length > 0 && (
          <p className="text-2">{t('missSavedMistakes', { n: result.issues.length })}</p>
        )}
        <div className="row">
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => setScenario(null)}>
            {t('missAnother')}
          </button>
          {result.issues.length > 0 && (
            <Link to="/mistakes" className="btn" style={{ flex: 1, textAlign: 'center' }}>
              {t('studyMistakes')}
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ---- CHAT ----
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <button className="btn" onClick={() => setScenario(null)}>✕</button>
        <b>{scenario.emoji} {scenario.title}</b>
        <button className="btn" onClick={() => void endMission()} disabled={busy || messages.length < 2}>
          {t('missEnd')}
        </button>
      </div>

      {/* Checklist mục tiêu */}
      <div className="card" style={{ marginBottom: 10, padding: 10 }}>
        {scenario.goals.map((g, i) => (
          <div key={i} style={{ opacity: goalsMet.includes(i) ? 1 : 0.45, fontSize: 14 }}>
            {goalsMet.includes(i) ? '✅' : '⬜'} {g}
          </div>
        ))}
      </div>

      <div ref={scrollRef} style={{ maxHeight: '52vh', overflowY: 'auto', marginBottom: 10 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            className="card"
            style={{
              marginBottom: 8,
              marginLeft: m.role === 'user' ? 40 : 0,
              marginRight: m.role === 'user' ? 0 : 40,
              background: m.role === 'user' ? 'var(--bg-2)' : 'var(--card)',
            }}
          >
            <p style={{ margin: 0 }}>{m.text}</p>
            {m.role === 'assistant' && (
              <button onClick={() => speak(m.text, 'en')} aria-label={t('listen')} style={{ minHeight: 'auto' }}>
                🔊
              </button>
            )}
          </div>
        ))}
        {busy && <p className="text-2">…</p>}
      </div>

      {hint && <p className="text-2" style={{ fontSize: 13 }}>💡 {hint}</p>}
      {msg && <p className="text-2" style={{ color: 'var(--bad)' }}>{msg}</p>}

      <div className="row">
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void send(input)}
          placeholder={t('missTypePh')}
          disabled={busy}
          autoCapitalize="sentences"
        />
        {stt && (
          <button className="btn" onClick={() => void speakInput()} disabled={busy || listening}>
            {listening ? '🎤…' : '🎤'}
          </button>
        )}
        <button className="btn-primary" style={{ width: 'auto' }} onClick={() => void send(input)} disabled={busy || !input.trim()}>
          {t('missSend')}
        </button>
      </div>
    </div>
  );
}
