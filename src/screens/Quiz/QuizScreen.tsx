import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildCloze, type ClozeQ, type SentenceDeps, type SentencePair } from '../../core/cloze';
import { buildQuiz, type QuizQ } from '../../core/quiz';
import { getDueCards } from '../../core/srs';
import type { VocabCard } from '../../core/types';
import { getSentenceDeps } from '../../services/dataBundle';
import { getAllCards } from '../../services/db';
import { recordSession, type SessionOutcome } from '../../services/gamify';
import { bumpWeakWord } from '../../services/stats';
import { speak } from '../../services/tts';
import { useI18n } from '../../i18n';

type Mode = 'mcq' | 'cloze' | 'translate';
type Source = 'due' | 'all';
type Phase = 'setup' | 'run' | 'done';

const SIZE = 10;

export default function QuizScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [deck, setDeck] = useState<VocabCard[]>([]);
  const [deps, setDeps] = useState<SentenceDeps | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<Phase>('setup');
  const [mode, setMode] = useState<Mode>('mcq');
  const [source, setSource] = useState<Source>('due');

  const [mcqs, setMcqs] = useState<QuizQ[]>([]);
  const [clozes, setClozes] = useState<ClozeQ[]>([]);
  const [trPairs, setTrPairs] = useState<SentencePair[]>([]);
  const [trShown, setTrShown] = useState(false);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<'' | 'ok' | 'wrong' | 'revealed'>('');
  const [hint, setHint] = useState(false);
  const [outcome, setOutcome] = useState<SessionOutcome | null>(null);

  useEffect(() => {
    void Promise.all([getAllCards(), getSentenceDeps()]).then(([cards, d]) => {
      setDeck(cards);
      setDeps(d);
      setLoaded(true);
    });
  }, []);

  const pool = useMemo(() => {
    const due = getDueCards(deck, Date.now());
    if (source === 'due' && due.length >= 4) return due;
    // Thẻ đến hạn ít quá thì lấy cả sổ (ưu tiên due lên đầu)
    const dueIds = new Set(due.map((c) => c.id));
    return [...due, ...deck.filter((c) => !dueIds.has(c.id))];
  }, [deck, source]);

  function start() {
    if (mode === 'mcq') {
      const qs = buildQuiz(pool, { size: SIZE });
      if (qs.length === 0) return;
      setMcqs(qs);
    } else if (mode === 'translate') {
      // Dịch ngược VI→EN từ cặp câu Tatoeba (0 token — IDEAS W2)
      if (!deps) return;
      const pairs = [...deps.pairs].sort(() => 0.5 - Math.random()).slice(0, SIZE);
      if (pairs.length === 0) return;
      setTrPairs(pairs);
      setTrShown(false);
    } else {
      const qs: ClozeQ[] = [];
      for (const c of pool) {
        if (c.lang !== 'en') continue;
        const q = buildCloze(c, deps ?? undefined);
        if (q) qs.push(q);
        if (qs.length >= SIZE) break;
      }
      if (qs.length === 0) return;
      setClozes(qs);
    }
    setIdx(0);
    setScore(0);
    setPicked(null);
    setInput('');
    setResult('');
    setHint(false);
    setOutcome(null);
    setPhase('run');
  }

  /** Ghi phiên vào gamification đúng một lần rồi sang summary. */
  function finish(answered: number, correct: number) {
    setPhase('done');
    if (answered > 0) void recordSession({ total: answered, correct }, Date.now()).then(setOutcome);
  }

  // ---- MCQ ----

  function pickOption(i: number) {
    if (picked != null) return;
    const q = mcqs[idx];
    setPicked(i);
    const right = i === q.answer;
    if (right) setScore((s) => s + 1);
    void bumpWeakWord(q.term, !right);
    setTimeout(() => {
      setPicked(null);
      if (idx + 1 >= mcqs.length) finish(mcqs.length, score + (right ? 1 : 0));
      else setIdx(idx + 1);
    }, 900);
  }

  // ---- Cloze ----

  const cq = clozes[idx];

  function checkCloze() {
    if (!cq || result) return;
    const ok =
      input.trim().toLowerCase() === cq.blank.toLowerCase() ||
      input.trim().toLowerCase() === cq.term.toLowerCase();
    setResult(ok ? 'ok' : 'wrong');
    if (ok) setScore((s) => s + 1);
    void bumpWeakWord(cq.term, !ok);
  }

  function nextCloze() {
    setResult('');
    setInput('');
    setHint(false);
    if (idx + 1 >= clozes.length) finish(clozes.length, score);
    else setIdx(idx + 1);
  }

  // ---- Translate-back ----

  const tp = trPairs[idx];

  function gradeTranslate(ok: boolean) {
    if (ok) setScore((s) => s + 1);
    setTrShown(false);
    setInput('');
    if (idx + 1 >= trPairs.length) finish(trPairs.length, score + (ok ? 1 : 0));
    else setIdx(idx + 1);
  }

  const total = mode === 'mcq' ? mcqs.length : mode === 'translate' ? trPairs.length : clozes.length;

  // ---- render ----

  if (phase === 'setup') {
    const notEnough = loaded && deck.length < 4;
    return (
      <div>
        <h1 className="screen-title">{t('homeQuiz')}</h1>
        <div className="chips">
          <button className={`chip${mode === 'mcq' ? ' active' : ''}`} onClick={() => setMode('mcq')}>
            {t('quizModeMcq')}
          </button>
          <button
            className={`chip${mode === 'cloze' ? ' active' : ''}`}
            onClick={() => setMode('cloze')}
          >
            {t('quizModeCloze')}
          </button>
          <button
            className={`chip${mode === 'translate' ? ' active' : ''}`}
            onClick={() => setMode('translate')}
          >
            {t('quizModeTranslate')}
          </button>
        </div>
        <div className="chips">
          <button
            className={`chip${source === 'due' ? ' active' : ''}`}
            onClick={() => setSource('due')}
          >
            {t('quizSourceDue')}
          </button>
          <button
            className={`chip${source === 'all' ? ' active' : ''}`}
            onClick={() => setSource('all')}
          >
            {t('quizSourceAll')}
          </button>
        </div>
        {notEnough && <p className="text-2">{t('quizNotEnough')}</p>}
        <button className="btn-primary" onClick={start} disabled={!loaded || notEnough}>
          {t('reviewStart')}
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="session-full">
        <div className="session-inner">
          <div className="card" style={{ textAlign: 'center', marginTop: 48 }}>
            <p className="hero-line">
              <span className="hl tabular">{t('quizScore', { right: score, total })}</span>
            </p>
            {outcome && outcome.earnedXp > 0 && (
              <p className="tabular" style={{ fontWeight: 600 }}>
                {t('xpEarned', { n: outcome.earnedXp })} · {t('streakNow', { n: outcome.streak })}
              </p>
            )}
            {outcome?.freezeUsed && <p className="text-2">{t('freezeSaved')}</p>}
            {outcome?.badges.map((b) => (
              <p key={b.id} style={{ fontWeight: 600 }}>
                {b.icon} {t('badgeNew', { name: t(`badge_${b.id}` as Parameters<typeof t>[0]) })}
              </p>
            ))}
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => setPhase('setup')}>
                {t('summaryContinue')}
              </button>
              <button className="btn" style={{ flex: 1 }} onClick={() => navigate('/')}>
                {t('summaryHome')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="session-full">
      <div className="session-inner">
        <div className="session-top">
          <button onClick={() => finish(idx, score)} aria-label={t('formCancel')}>
            ✕
          </button>
          <div className="session-bar">
            <i style={{ width: `${(idx / total) * 100}%` }} />
          </div>
          <span className="tabular text-2">
            {idx + 1}/{total}
          </span>
        </div>

        {mode === 'mcq' && mcqs[idx] && (
          <div>
            <div className="card" style={{ textAlign: 'center', marginBottom: 14 }}>
              <div className="fc__head" style={{ fontSize: 26 }}>
                {mcqs[idx].prompt}
              </div>
              {mcqs[idx].dir === 'term2meaning' && (
                <button
                  className="btn"
                  style={{ margin: '8px auto 0' }}
                  onClick={() => speak(mcqs[idx].term, 'en')}
                >
                  🔊
                </button>
              )}
            </div>
            {mcqs[idx].options.map((o, i) => {
              let cls = 'opt';
              if (picked != null) {
                if (i === mcqs[idx].answer) cls += ' opt--right';
                else if (i === picked) cls += ' opt--wrong';
              }
              return (
                <button key={i} className={cls} onClick={() => pickOption(i)}>
                  {o}
                </button>
              );
            })}
            <p className="text-2 tabular" style={{ textAlign: 'center' }}>
              {t('quizScore', { right: score, total })}
            </p>
          </div>
        )}

        {mode === 'translate' && tp && (
          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <p className="cloze-sentence">{tp.vi}</p>
              <p className="fc__src">
                <a
                  href={`https://tatoeba.org/en/sentences/show/${tp.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('clozeSourceTatoeba')} #{tp.id}
                </a>
              </p>
            </div>

            {!trShown ? (
              <>
                <textarea
                  className="input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('tbYourEnglish')}
                  autoFocus
                  rows={2}
                />
                <button
                  className="btn-primary"
                  style={{ marginTop: 10 }}
                  onClick={() => setTrShown(true)}
                  disabled={!input.trim()}
                >
                  {t('tbCompare')}
                </button>
              </>
            ) : (
              <>
                <div className="card" style={{ marginBottom: 10 }}>
                  <p className="text-2" style={{ margin: 0, fontSize: 13 }}>
                    {t('tbYours')}
                  </p>
                  <p style={{ margin: '2px 0 10px' }}>{input}</p>
                  <p className="text-2" style={{ margin: 0, fontSize: 13 }}>
                    {t('tbReference')}
                  </p>
                  <p style={{ margin: '2px 0 0', fontWeight: 600 }}>
                    {tp.en}{' '}
                    <button onClick={() => speak(tp.en, 'en')} aria-label={t('listen')}>
                      🔊
                    </button>
                  </p>
                </div>
                <p className="text-2" style={{ fontSize: 13 }}>
                  {t('tbSelfGrade')}
                </p>
                <div className="rate-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <button className="rate rate--good" onClick={() => gradeTranslate(true)}>
                    {t('tbGood')}
                  </button>
                  <button className="rate rate--again" onClick={() => gradeTranslate(false)}>
                    {t('tbBad')}
                  </button>
                </div>
              </>
            )}
            <p className="text-2 tabular" style={{ textAlign: 'center', marginTop: 10 }}>
              {t('quizScore', { right: score, total })}
            </p>
          </div>
        )}

        {mode === 'cloze' && cq && (
          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <p className="cloze-sentence">
                {cq.before}
                <span className="cloze-blank">
                  {result ? cq.blank : hint ? `${cq.blank[0]}…` : '____'}
                </span>
                {cq.after}
              </p>
              {cq.vi && result && <p className="text-2">{cq.vi}</p>}
              <p className="fc__src">
                {cq.source === 'context' && t('clozeSourceContext')}
                {cq.source === 'example' && t('clozeSourceExample')}
                {cq.source === 'tatoeba' && (
                  <a
                    href={`https://tatoeba.org/en/sentences/show/${cq.tatoebaId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('clozeSourceTatoeba')} #{cq.tatoebaId}
                  </a>
                )}
              </p>
            </div>

            {result === '' ? (
              <>
                <input
                  className="input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && checkCloze()}
                  placeholder={t('clozeYourAnswer')}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={checkCloze} disabled={!input.trim()}>
                    {t('clozeCheck')}
                  </button>
                  <button className="btn" onClick={() => setHint(true)} disabled={hint}>
                    {t('clozeHint')}
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      setResult('revealed');
                      void bumpWeakWord(cq.term, true);
                    }}
                  >
                    {t('clozeReveal')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p
                  style={{
                    color: result === 'ok' ? 'var(--ok)' : 'var(--bad)',
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                >
                  {result === 'ok' ? '✓' : `✗ ${cq.blank}`}
                </p>
                <div className="row">
                  <button className="btn" onClick={() => speak(cq.before + cq.blank + cq.after, 'en')}>
                    🔊
                  </button>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={nextCloze}>
                    {t('next')}
                  </button>
                </div>
              </>
            )}
            <p className="text-2 tabular" style={{ textAlign: 'center', marginTop: 10 }}>
              {t('quizScore', { right: score, total })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
