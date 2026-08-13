import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  gradeSentence,
  isPerfect,
  scoreOf,
  wordTapChoices,
  wrongWords,
  type WordDiff,
} from '../../core/dictation';
import { fromDictation } from '../../core/mistakes';
import { hasAiKey } from '../../services/ai/client';
import {
  articleToSource,
  dictationFeedback,
  fromTatoeba,
  fromText,
  packToSource,
  savedArticles,
  fromPacks,
  type DictItem,
  type DictSource,
} from '../../services/dictationSource';
import { recordSession, type SessionOutcome } from '../../services/gamify';
import { recordMistakes } from '../../services/mistakes';
import { getSettings } from '../../services/settings';
import { speak } from '../../services/tts';
import type { PackEntry } from '../../services/db';
import type { VoaArticle } from '../../services/voa';
import { useI18n } from '../../i18n';

type Phase = 'pick' | 'run' | 'done';
type Mode = 'type' | 'tap';

export default function DictationScreen() {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>('pick');
  const [mode, setMode] = useState<Mode>('type');

  // Picker data
  const [packs, setPacks] = useState<PackEntry[]>([]);
  const [articles, setArticles] = useState<VoaArticle[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // Session
  const [src, setSrc] = useState<DictSource | null>(null);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [tapped, setTapped] = useState<string[]>([]);
  const [diff, setDiff] = useState<WordDiff[] | null>(null);
  const [showVi, setShowVi] = useState(true);
  const [scores, setScores] = useState<number[]>([]);
  const [allWrong, setAllWrong] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<SessionOutcome | null>(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    void fromPacks().then(setPacks);
    void savedArticles().then(setArticles);
  }, []);

  function begin(source: DictSource) {
    if (source.items.length === 0) {
      setMsg(t('dictEmpty'));
      return;
    }
    setSrc(source);
    setIdx(0);
    setInput('');
    setTapped([]);
    setDiff(null);
    setScores([]);
    setAllWrong([]);
    setOutcome(null);
    setFeedback('');
    setPhase('run');
    setTimeout(() => speak(source.items[0].en, 'en'), 200);
  }

  async function pickTatoeba() {
    setLoading(true);
    setMsg('');
    const s = await fromTatoeba(10);
    setLoading(false);
    if (s) begin(s);
    else setMsg(t('dictNoBundle'));
  }

  const cur: DictItem | undefined = src?.items[idx];
  const tapChoices = useMemo(
    () => (cur && mode === 'tap' ? wordTapChoices(cur.en) : []),
    [cur, mode],
  );

  function check() {
    if (!cur || diff) return;
    const answer = mode === 'tap' ? tapped.join(' ') : input;
    const d = gradeSentence(cur.en, answer);
    setDiff(d);
    setScores((s) => [...s, scoreOf(d)]);
    const wrong = wrongWords(d);
    if (wrong.length) {
      setAllWrong((w) => [...w, ...wrong]);
      void recordMistakes(fromDictation(d, cur.en, Date.now()));
    }
  }

  function reveal() {
    if (!cur || diff) return;
    const d = gradeSentence(cur.en, ''); // input rỗng → mọi từ "missing"
    setDiff(d);
    setScores((s) => [...s, 0]);
    const wrong = wrongWords(d);
    setAllWrong((w) => [...w, ...wrong]);
    void recordMistakes(fromDictation(d, cur.en, Date.now()));
  }

  function nextSentence() {
    if (!src) return;
    if (idx + 1 >= src.items.length) {
      finish();
      return;
    }
    const n = idx + 1;
    setIdx(n);
    setInput('');
    setTapped([]);
    setDiff(null);
    setTimeout(() => speak(src.items[n].en, 'en'), 150);
  }

  function finish() {
    setPhase('done');
    const total = scores.length;
    const correct = scores.filter((s) => s >= 60).length;
    if (total > 0) void recordSession({ total, correct }, Date.now()).then(setOutcome);
    if (hasAiKey() && allWrong.length) {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length));
      void dictationFeedback(allWrong, avg).then(setFeedback);
    }
  }

  // ---- PICK ----
  if (phase === 'pick') {
    return (
      <div>
        <h1 className="screen-title">{t('practiceDictation')}</h1>
        {msg && <p className="text-2" style={{ color: 'var(--bad)' }}>{msg}</p>}

        <div className="card" style={{ marginBottom: 12 }}>
          <h3>{t('dictQuickStart')}</h3>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <button className="btn" onClick={() => void pickTatoeba()} disabled={loading}>
              {loading ? '…' : t('dictFromTatoeba')}
            </button>
          </div>
        </div>

        {packs.length > 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <h3>{t('dictFromPacks')}</h3>
            <div className="chips">
              {packs.map((p) => (
                <button key={p.key} className="chip" onClick={() => begin(packToSource(p))}>
                  {p.pack.topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {articles.length > 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <h3>{t('dictFromVoa')}</h3>
            <div className="chips">
              {articles.map((a) => (
                <button key={a.url} className="chip" onClick={() => begin(articleToSource(a))}>
                  {a.title.slice(0, 40)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <h3>{t('dictFromText')}</h3>
          <textarea
            className="input"
            rows={3}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={t('dictTextPh')}
          />
          <button
            className="btn"
            style={{ marginTop: 8 }}
            disabled={!pasteText.trim()}
            onClick={() => begin(fromText(pasteText))}
          >
            {t('dictStart')}
          </button>
        </div>
      </div>
    );
  }

  // ---- DONE ----
  if (phase === 'done') {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length));
    return (
      <div className="session-full">
        <div className="session-inner">
          <div className="card" style={{ textAlign: 'center', marginTop: 40 }}>
            <p className="hero-line">
              <span className="hl tabular">{t('dictScore', { n: avg })}</span>
            </p>
            {outcome && outcome.earnedXp > 0 && (
              <p className="tabular" style={{ fontWeight: 600 }}>
                {t('xpEarned', { n: outcome.earnedXp })} · {t('streakNow', { n: outcome.streak })}
              </p>
            )}
            {allWrong.length > 0 && (
              <p className="text-2">{t('dictSavedMistakes', { n: allWrong.length })}</p>
            )}
            {feedback && (
              <p className="text-2" style={{ textAlign: 'left', marginTop: 10 }}>
                💡 {feedback}
              </p>
            )}
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => setPhase('pick')}>
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

  // ---- RUN ----
  if (!cur) return null;
  return (
    <div className="session-full">
      <div className="session-inner">
        <div className="session-top">
          <button onClick={finish} aria-label={t('formCancel')}>
            ✕
          </button>
          <div className="session-bar">
            <i style={{ width: `${(idx / src!.items.length) * 100}%` }} />
          </div>
          <span className="tabular text-2">
            {idx + 1}/{src!.items.length}
          </span>
        </div>

        <div className="row" style={{ marginBottom: 12 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => speak(cur.en, 'en')}>
            🔊 {t('dictReplay')}
          </button>
          <button
            className="btn"
            onClick={() => speak(cur.en, 'en', { rate: (getSettings().ttsRate ?? 0.95) * 0.7 })}
          >
            🐢
          </button>
          <button className="btn" onClick={() => setMode(mode === 'type' ? 'tap' : 'type')}>
            {mode === 'type' ? t('dictModeTap') : t('dictModeType')}
          </button>
        </div>

        {!diff && mode === 'type' && (
          <>
            <textarea
              className="input"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  check();
                }
              }}
              placeholder={t('dictTypePh')}
              autoFocus
              autoCapitalize="none"
            />
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={check} disabled={!input.trim()}>
                {t('clozeCheck')}
              </button>
              <button className="btn" onClick={reveal}>
                {t('clozeReveal')}
              </button>
            </div>
          </>
        )}

        {!diff && mode === 'tap' && (
          <>
            <div className="card" style={{ minHeight: 52 }}>
              {tapped.length ? tapped.join(' ') : <span className="text-2">{t('dictTapHint')}</span>}
            </div>
            <div className="chips" style={{ marginTop: 10 }}>
              {tapChoices.map((w, i) => {
                // Ẩn chip đã dùng đủ số lần từ đó xuất hiện trong câu
                const usedSame = tapped.filter((x) => x === w).length;
                const availSame = tapChoices.filter((x) => x === w).length;
                return (
                  <button
                    key={`${w}-${i}`}
                    className="chip"
                    disabled={usedSame >= availSame}
                    onClick={() => setTapped((prev) => [...prev, w])}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={check} disabled={!tapped.length}>
                {t('clozeCheck')}
              </button>
              <button className="btn" onClick={() => setTapped((p) => p.slice(0, -1))} disabled={!tapped.length}>
                ⌫
              </button>
              <button className="btn" onClick={reveal}>
                {t('clozeReveal')}
              </button>
            </div>
          </>
        )}

        {diff && (
          <>
            <div className="card">
              <p style={{ fontSize: 18, lineHeight: 1.7, margin: 0 }}>
                {diff.map((d, i) => (
                  <span
                    key={i}
                    style={{
                      color:
                        d.kind === 'ok'
                          ? 'var(--ok)'
                          : d.kind === 'extra'
                            ? 'var(--muted)'
                            : 'var(--bad)',
                      textDecoration: d.kind === 'extra' ? 'line-through' : undefined,
                      marginRight: 6,
                    }}
                  >
                    {d.kind === 'missing' ? `[${d.expected}]` : (d.got ?? d.expected)}
                  </span>
                ))}
              </p>
              {!isPerfect(diff) && (
                <p style={{ marginTop: 10, fontWeight: 600 }}>{cur.en}</p>
              )}
              {showVi && cur.vi && <p className="text-2">{cur.vi}</p>}
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn" onClick={() => speak(cur.en, 'en')}>
                🔊
              </button>
              {cur.vi && (
                <button className="btn" onClick={() => setShowVi((v) => !v)}>
                  {showVi ? 'VI ✓' : 'VI'}
                </button>
              )}
              <button className="btn-primary" style={{ flex: 1 }} onClick={nextSentence} autoFocus>
                {idx + 1 >= src!.items.length ? t('dictFinish') : t('next')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
