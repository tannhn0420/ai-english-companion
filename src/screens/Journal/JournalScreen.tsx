import { useEffect, useState } from 'react';
import { journalPrompt } from '../../core/journalPrompt';
import { fromProofread } from '../../core/mistakes';
import type { JournalEntry, ProofreadResult } from '../../core/types';
import { hasAiKey } from '../../services/ai/client';
import { proofread } from '../../services/ai/writing';
import { dayKey } from '../../core/dayKey';
import { listJournal, putJournal } from '../../services/db';
import { recordSession } from '../../services/gamify';
import { recordMistakes } from '../../services/mistakes';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';

const DRAFT_KEY = 'aec-journal-draft';

export default function JournalScreen() {
  const { t } = useI18n();
  const now = Date.now();
  const prompt = journalPrompt(now);

  const [text, setText] = useState('');
  const [result, setResult] = useState<ProofreadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [savedMistakes, setSavedMistakes] = useState(0);
  const [history, setHistory] = useState<JournalEntry[]>([]);

  // Khôi phục nháp + lịch sử
  useEffect(() => {
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      if (d) setText(d);
    } catch {
      /* ignore */
    }
    void listJournal().then(setHistory);
  }, []);

  // Autosave nháp (ARCHITECTURE §10 — không bao giờ mất input)
  useEffect(() => {
    try {
      if (text.trim()) localStorage.setItem(DRAFT_KEY, text);
      else localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }, [text]);

  async function submit() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setMsg('');
    try {
      const res = await proofread(text);
      setResult(res);

      const entry: JournalEntry = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        date: dayKey(Date.now()),
        prompt,
        text,
        result: res,
        createdAt: Date.now(),
      };
      await putJournal(entry);
      void listJournal().then(setHistory);

      const mistakes = fromProofread(res.issues, Date.now());
      if (mistakes.length) {
        await recordMistakes(mistakes);
        setSavedMistakes(mistakes.length);
      }
      // Viết = một hoạt động của ngày (streak/XP)
      void recordSession({ total: 1, correct: res.issues.length === 0 ? 1 : 0 }, Date.now());

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setText('');
    setSavedMistakes(0);
    setMsg('');
  }

  return (
    <div>
      <h1 className="screen-title">{t('practiceJournal')}</h1>

      {!hasAiKey() && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p className="text-2" style={{ margin: 0 }}>
            {t('practiceNeedKey')} <Link to="/settings">{t('tabSettings')} →</Link>
          </p>
        </div>
      )}

      {!result ? (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <p className="text-2" style={{ marginTop: 0, fontSize: 13 }}>
              {t('journalToday')}
            </p>
            <p className="hero-line" style={{ fontSize: 18, margin: 0 }}>
              <span className="hl">{prompt}</span>
            </p>
          </div>
          <textarea
            className="input"
            rows={7}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('journalPlaceholder')}
            disabled={!hasAiKey()}
          />
          <p className="text-2" style={{ fontSize: 12 }}>
            {t('journalDraftSaved')}
          </p>
          {msg && <p style={{ color: 'var(--bad)' }}>{msg}</p>}
          <button
            className="btn-primary"
            onClick={() => void submit()}
            disabled={!hasAiKey() || loading || !text.trim()}
          >
            {loading ? t('journalChecking') : t('journalSubmit')}
          </button>
        </>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>{t('journalCorrected')}</h3>
              {result.level && <span className="badge-soon">CEFR {result.level}</span>}
            </div>
            <p style={{ whiteSpace: 'pre-wrap' }}>{result.corrected}</p>
          </div>

          {result.issues.length === 0 ? (
            <div className="card" style={{ textAlign: 'center' }}>
              <p className="hero-line" style={{ fontSize: 20 }}>
                <span className="hl">{t('journalPerfect')}</span>
              </p>
            </div>
          ) : (
            <>
              <h3>{t('journalIssues', { n: result.issues.length })}</h3>
              {result.issues.map((it, i) => (
                <div key={i} className="card" style={{ marginBottom: 8 }}>
                  <p style={{ margin: '0 0 4px' }}>
                    <span style={{ color: 'var(--bad)', textDecoration: 'line-through' }}>{it.original}</span>
                    {' → '}
                    <span style={{ color: 'var(--ok)', fontWeight: 600 }}>{it.suggestion}</span>
                  </p>
                  <p className="text-2" style={{ margin: 0, fontSize: 13 }}>
                    {it.why}
                  </p>
                </div>
              ))}
              {savedMistakes > 0 && (
                <p className="text-2">{t('journalSavedMistakes', { n: savedMistakes })}</p>
              )}
            </>
          )}

          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={reset}>
              {t('journalNew')}
            </button>
            {savedMistakes > 0 && (
              <Link to="/mistakes" className="btn" style={{ flex: 1, textAlign: 'center' }}>
                {t('studyMistakes')}
              </Link>
            )}
          </div>
        </>
      )}

      {history.length > 0 && !result && (
        <>
          <h3 style={{ marginTop: 20 }}>{t('journalHistory')}</h3>
          {history.map((h) => (
            <div key={h.id} className="deck-row">
              <span aria-hidden>📔</span>
              <span className="deck-row__main">
                <span className="deck-row__term">{h.date}</span>
                <div className="deck-row__meaning">{h.text}</div>
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
