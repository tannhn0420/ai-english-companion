import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toClozeCard } from '../../core/mistakes';
import type { Mistake } from '../../core/types';
import { recordSession } from '../../services/gamify';
import { deleteMistake, getAllMistakes, getDueMistakes, reviewMistake } from '../../services/mistakes';
import { speak } from '../../services/tts';
import { useI18n } from '../../i18n';

type Phase = 'list' | 'review' | 'done';

export default function MistakesScreen() {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>('list');
  const [all, setAll] = useState<Mistake[]>([]);
  const [queue, setQueue] = useState<Mistake[]>([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<'' | 'ok' | 'wrong'>('');
  const [correct, setCorrect] = useState(0);

  useEffect(() => {
    void getAllMistakes().then((m) => setAll(m.sort((a, b) => b.createdAt - a.createdAt)));
  }, [phase]);

  const dueCount = useMemo(() => all.filter((m) => (m.due ?? 0) <= Date.now()).length, [all]);

  async function startReview() {
    const due = await getDueMistakes(Date.now());
    // Chỉ ôn được lỗi tạo được cloze (có errorSpan trong câu đúng)
    const usable = due.filter((m) => toClozeCard(m));
    if (usable.length === 0) return;
    setQueue(usable.slice(0, 15));
    setIdx(0);
    setInput('');
    setResult('');
    setCorrect(0);
    setPhase('review');
  }

  const cur = queue[idx];
  const cloze = cur ? toClozeCard(cur) : null;

  function check() {
    if (!cur || !cloze || result) return;
    const ok = input.trim().toLowerCase() === cloze.blank.toLowerCase();
    setResult(ok ? 'ok' : 'wrong');
    if (ok) setCorrect((c) => c + 1);
    void reviewMistake(cur, ok, Date.now());
  }

  function nextCard() {
    setResult('');
    setInput('');
    if (idx + 1 >= queue.length) {
      const total = queue.length;
      void recordSession({ total, correct }, Date.now());
      setPhase('done');
    } else {
      setIdx(idx + 1);
    }
  }

  async function remove(id: string) {
    await deleteMistake(id);
    setAll((prev) => prev.filter((m) => m.id !== id));
  }

  // ---- LIST ----
  if (phase === 'list') {
    return (
      <div>
        <h1 className="screen-title">{t('studyMistakes')}</h1>
        {all.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <p className="hero-line" style={{ fontSize: 20 }}>
              {t('mistEmptyTitle')}
            </p>
            <p className="text-2">{t('mistEmptyHint')}</p>
          </div>
        ) : (
          <>
            <button
              className="btn-primary"
              style={{ marginBottom: 12 }}
              onClick={() => void startReview()}
              disabled={dueCount === 0}
            >
              {dueCount > 0 ? t('mistReviewDue', { n: dueCount }) : t('mistNothingDue')}
            </button>
            {all.map((m) => (
              <div key={m.id} className="deck-row">
                <span aria-hidden>
                  {m.source === 'dictation' ? '🎧' : m.source === 'writing' ? '✍️' : '📝'}
                </span>
                <span className="deck-row__main">
                  <span className="deck-row__term">{m.errorSpan}</span>
                  <div className="deck-row__meaning">{m.corrected}</div>
                  {m.note && (
                    <div className="text-2" style={{ fontSize: 12 }}>
                      {m.note}
                    </div>
                  )}
                </span>
                <button onClick={() => void remove(m.id)} aria-label={t('formDelete')}>
                  🗑️
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  // ---- DONE ----
  if (phase === 'done') {
    return (
      <div className="session-full">
        <div className="session-inner">
          <div className="card" style={{ textAlign: 'center', marginTop: 48 }}>
            <p className="hero-line">
              <span className="hl tabular">{t('quizScore', { right: correct, total: queue.length })}</span>
            </p>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => setPhase('list')}>
                {t('summaryContinue')}
              </button>
              <Link to="/" className="btn" style={{ flex: 1, textAlign: 'center' }}>
                {t('summaryHome')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- REVIEW ----
  if (!cur || !cloze) return null;
  return (
    <div className="session-full">
      <div className="session-inner">
        <div className="session-top">
          <button onClick={() => setPhase('list')} aria-label={t('formCancel')}>
            ✕
          </button>
          <div className="session-bar">
            <i style={{ width: `${(idx / queue.length) * 100}%` }} />
          </div>
          <span className="tabular text-2">
            {idx + 1}/{queue.length}
          </span>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <p className="cloze-sentence">
            {cloze.before}
            <span className="cloze-blank">{result ? cloze.blank : '____'}</span>
            {cloze.after}
          </p>
          {cur.note && result && <p className="text-2">{cur.note}</p>}
        </div>

        {result === '' ? (
          <>
            <input
              className="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && check()}
              placeholder={t('clozeYourAnswer')}
              autoFocus
              autoCapitalize="none"
            />
            <button className="btn-primary" style={{ marginTop: 10 }} onClick={check} disabled={!input.trim()}>
              {t('clozeCheck')}
            </button>
          </>
        ) : (
          <>
            <p style={{ color: result === 'ok' ? 'var(--ok)' : 'var(--bad)', fontWeight: 600, textAlign: 'center' }}>
              {result === 'ok' ? '✓' : `✗ ${cloze.blank}`}
            </p>
            <div className="row">
              <button className="btn" onClick={() => speak(cloze.before + cloze.blank + cloze.after, 'en')}>
                🔊
              </button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={nextCard}>
                {idx + 1 >= queue.length ? t('dictFinish') : t('next')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
