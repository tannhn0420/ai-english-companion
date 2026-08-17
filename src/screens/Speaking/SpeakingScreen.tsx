import { useRef, useState } from 'react';
import { gradeSentence, isPerfect, scoreOf, wrongWords, type WordDiff } from '../../core/dictation';
import { fromSpeaking } from '../../core/mistakes';
import { IELTS_QUESTIONS, DRILL_PRESETS } from '../../core/speakingData';
import type { DrillPack, SpeakingAssessment } from '../../core/types';
import { hasAiKey } from '../../services/ai/client';
import { assessSpeakingAudio, assessSpeakingTranscript, generateDrill } from '../../services/ai/speaking';
import { fromTatoeba, type DictSource } from '../../services/dictationSource';
import { recordSession } from '../../services/gamify';
import { recordMistakes } from '../../services/mistakes';
import { recorderAvailable, startRecording, type ActiveRecorder, type Recording } from '../../services/recorder';
import { listenOnce, sttAvailable } from '../../services/stt';
import { speak } from '../../services/tts';
import { useI18n, type MsgKey } from '../../i18n';

type Mode = 'read' | 'ielts' | 'drill';

export default function SpeakingScreen() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('read');
  const stt = sttAvailable();
  const canRecord = recorderAvailable();

  return (
    <div>
      <h1 className="screen-title">{t('practiceSpeaking')}</h1>
      <div className="chips">
        {(
          [
            ['read', 'spkRead'],
            ['ielts', 'spkIelts'],
            ['drill', 'spkDrill'],
          ] as [Mode, MsgKey][]
        ).map(([k, label]) => (
          <button key={k} className={`chip${mode === k ? ' active' : ''}`} onClick={() => setMode(k)}>
            {t(label)}
          </button>
        ))}
      </div>

      {mode === 'read' && <ReadAloud stt={stt} canRecord={canRecord} />}
      {mode === 'ielts' && <Ielts stt={stt} canRecord={canRecord} />}
      {mode === 'drill' && <Drill />}
    </div>
  );
}

/* ---------------- Đọc câu mẫu ---------------- */

function ReadAloud({ stt, canRecord }: { stt: boolean; canRecord: boolean }) {
  const { t } = useI18n();
  const [src, setSrc] = useState<DictSource | null>(null);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const [diff, setDiff] = useState<WordDiff[] | null>(null);
  const [recUrl, setRecUrl] = useState('');
  const recRef = useRef<ActiveRecorder | null>(null);
  const [msg, setMsg] = useState('');

  async function begin() {
    setLoading(true);
    setMsg('');
    const s = await fromTatoeba(8);
    setLoading(false);
    if (!s) {
      setMsg(t('dictNoBundle'));
      return;
    }
    setSrc(s);
    setIdx(0);
    setDiff(null);
    setRecUrl('');
    setTimeout(() => speak(s.items[0].en, 'en'), 200);
  }

  const cur = src?.items[idx];

  async function speakAndScore() {
    if (!cur || listening) return;
    setDiff(null);
    setPartial('');
    setListening(true);
    try {
      const { promise } = listenOnce('en', setPartial);
      const transcript = await promise;
      const d = gradeSentence(cur.en, transcript);
      setDiff(d);
      const wrong = wrongWords(d);
      if (wrong.length) void recordMistakes(fromSpeaking(d, cur.en, Date.now()));
    } catch {
      setMsg(t('spkMicErr'));
    } finally {
      setListening(false);
    }
  }

  async function toggleRecord() {
    if (recRef.current) {
      const rec = await recRef.current.stop();
      recRef.current = null;
      setRecUrl(rec.url);
      setListening(false);
    } else {
      try {
        recRef.current = await startRecording();
        setListening(true);
        setRecUrl('');
      } catch {
        setMsg(t('spkMicErr'));
      }
    }
  }

  function next() {
    if (!src) return;
    const n = idx + 1;
    if (n >= src.items.length) {
      void recordSession({ total: src.items.length, correct: src.items.length }, Date.now());
      setSrc(null);
      return;
    }
    setIdx(n);
    setDiff(null);
    setRecUrl('');
    setTimeout(() => speak(src.items[n].en, 'en'), 150);
  }

  if (!src) {
    return (
      <div>
        {msg && <p className="text-2" style={{ color: 'var(--bad)' }}>{msg}</p>}
        <p className="text-2">{stt ? t('spkReadHintStt') : t('spkReadHintRec')}</p>
        <button className="btn-primary" onClick={() => void begin()} disabled={loading}>
          {loading ? '…' : t('spkStart')}
        </button>
      </div>
    );
  }

  if (!cur) return null;
  return (
    <div>
      <div className="session-top">
        <div className="session-bar">
          <i style={{ width: `${(idx / src.items.length) * 100}%` }} />
        </div>
        <span className="tabular text-2">{idx + 1}/{src.items.length}</span>
      </div>

      <div className="fc" style={{ minHeight: 160, cursor: 'default' }}>
        <div className="fc__head" style={{ fontSize: 24 }}>{cur.en}</div>
        {cur.vi && <div className="fc__example">{cur.vi}</div>}
        <button className="btn" style={{ margin: '10px auto 0', width: 'auto' }} onClick={() => speak(cur.en, 'en')}>
          🔊 {t('dictReplay')}
        </button>
      </div>

      {listening && partial && <p className="text-2" style={{ textAlign: 'center' }}>“{partial}”</p>}

      {diff && (
        <div className="card" style={{ marginTop: 10 }}>
          <p style={{ fontSize: 18, lineHeight: 1.7, margin: 0 }}>
            {diff.map((d, i) => (
              <span
                key={i}
                style={{
                  color: d.kind === 'ok' ? 'var(--ok)' : d.kind === 'extra' ? 'var(--muted)' : 'var(--bad)',
                  marginRight: 6,
                }}
              >
                {d.kind === 'missing' ? `[${d.expected}]` : d.got ?? d.expected}
              </span>
            ))}
          </p>
          <p className="tabular" style={{ fontWeight: 600, marginBottom: 0 }}>
            {isPerfect(diff) ? '🌟 ' : ''}
            {t('spkScore', { n: scoreOf(diff) })}
          </p>
        </div>
      )}

      {recUrl && <audio controls src={recUrl} style={{ width: '100%', marginTop: 10 }} />}
      {msg && <p className="text-2" style={{ color: 'var(--bad)' }}>{msg}</p>}

      <div className="rate-row" style={{ gridTemplateColumns: '2fr 1fr', marginTop: 10 }}>
        {stt ? (
          <button className="rate rate--good" onClick={() => void speakAndScore()} disabled={listening}>
            {listening ? `🎤 ${t('spkListening')}` : `🎤 ${t('spkSpeak')}`}
          </button>
        ) : canRecord ? (
          <button className="rate rate--good" onClick={() => void toggleRecord()}>
            {recRef.current ? `⏹ ${t('spkStopRec')}` : `🎤 ${t('spkRecord')}`}
          </button>
        ) : (
          <span className="text-2">{t('spkNoMic')}</span>
        )}
        <button className="rate" onClick={next}>{t('next')}</button>
      </div>
    </div>
  );
}

/* ---------------- IELTS ---------------- */

function Ielts({ stt, canRecord }: { stt: boolean; canRecord: boolean }) {
  const { t } = useI18n();
  const [qIdx, setQIdx] = useState(() => Math.floor((Date.now() / 3.6e6) % IELTS_QUESTIONS.length));
  const question = IELTS_QUESTIONS[qIdx];
  const [rec, setRec] = useState<Recording | null>(null);
  const recRef = useRef<ActiveRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SpeakingAssessment | null>(null);
  const [msg, setMsg] = useState('');
  const geminiAvailable = hasAiKey();

  async function toggleRec() {
    setMsg('');
    if (recRef.current) {
      const r = await recRef.current.stop();
      recRef.current = null;
      setRec(r);
      setRecording(false);
    } else {
      try {
        recRef.current = await startRecording();
        setRec(null);
        setResult(null);
        setRecording(true);
      } catch {
        setMsg(t('spkMicErr'));
      }
    }
  }

  async function assessViaGemini() {
    if (!rec) return;
    setBusy(true);
    setMsg('');
    try {
      setResult(await assessSpeakingAudio(rec.blob, question));
      void recordSession({ total: 1, correct: 1 }, Date.now());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function assessViaStt() {
    setBusy(true);
    setMsg('');
    setResult(null);
    try {
      const { promise } = listenOnce('en', () => {});
      const transcript = await promise;
      if (!transcript) throw new Error(t('spkMicErr'));
      setResult(await assessSpeakingTranscript(transcript, question));
      void recordSession({ total: 1, correct: 1 }, Date.now());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function nextQuestion() {
    setQIdx((i) => (i + 1) % IELTS_QUESTIONS.length);
    setRec(null);
    setResult(null);
    setMsg('');
  }

  if (!geminiAvailable && !stt) {
    return <p className="text-2">{t('spkIeltsNeedKey')}</p>;
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <p className="text-2" style={{ marginTop: 0, fontSize: 13 }}>{t('spkIeltsQ')}</p>
        <p className="hero-line" style={{ fontSize: 18, margin: 0 }}>
          <span className="hl">{question}</span>
        </p>
        <button className="btn" style={{ marginTop: 8 }} onClick={() => speak(question, 'en')}>🔊</button>
      </div>

      {msg && <p className="text-2" style={{ color: 'var(--bad)' }}>{msg}</p>}

      {/* Ưu tiên ghi âm + Gemini nghe (chấm cả phát âm); nếu không có key mà có STT thì dùng STT. */}
      {geminiAvailable && canRecord ? (
        <>
          <button className="btn-primary" onClick={() => void toggleRec()} disabled={busy}>
            {recording ? `⏹ ${t('spkStopRec')}` : rec ? `🎤 ${t('spkRerecord')}` : `🎤 ${t('spkRecordAnswer')}`}
          </button>
          {rec && (
            <>
              <audio controls src={rec.url} style={{ width: '100%', margin: '10px 0' }} />
              <button className="btn-primary" onClick={() => void assessViaGemini()} disabled={busy}>
                {busy ? t('spkAssessing') : t('spkAssess')}
              </button>
            </>
          )}
        </>
      ) : (
        <button className="btn-primary" onClick={() => void assessViaStt()} disabled={busy}>
          {busy ? t('spkListening') : `🎤 ${t('spkAnswerStt')}`}
        </button>
      )}

      {result && <AssessmentView a={result} />}

      <button className="btn" style={{ marginTop: 12 }} onClick={nextQuestion}>
        {t('spkNextQ')}
      </button>
    </div>
  );
}

function AssessmentView({ a }: { a: SpeakingAssessment }) {
  const { t } = useI18n();
  const rows: [MsgKey, typeof a.criteria.fluency][] = [
    ['spkFluency', a.criteria.fluency],
    ['spkLexical', a.criteria.lexical],
    ['spkGrammar', a.criteria.grammar],
    ['spkPron', a.criteria.pronunciation],
  ];
  return (
    <div style={{ marginTop: 12 }}>
      <div className="card" style={{ textAlign: 'center', marginBottom: 12 }}>
        <p className="hero-line" style={{ margin: 0 }}>
          <span className="hl tabular">IELTS ~ {a.overall}</span>
        </p>
      </div>
      {rows.map(([label, c]) => (
        <div key={label} className="card" style={{ marginBottom: 8 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>{t(label)}</b>
            <span className="tabular" style={{ fontWeight: 800 }}>{c?.band}</span>
          </div>
          <p className="text-2" style={{ margin: '4px 0 0', fontSize: 13 }}>{c?.comment}</p>
        </div>
      ))}
      {a.better && (
        <div className="card">
          <b>{t('spkBetter')}</b>
          <p style={{ margin: '4px 0 0' }}>{a.better}</p>
        </div>
      )}
    </div>
  );
}

/* ---------------- Drill ---------------- */

function Drill() {
  const { t } = useI18n();
  const [pack, setPack] = useState<DrillPack | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function run(sound: string) {
    if (!sound.trim() || loading) return;
    setLoading(true);
    setMsg('');
    try {
      setPack(await generateDrill(sound));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  if (!hasAiKey()) return <p className="text-2">{t('practiceNeedKey')}</p>;

  return (
    <div>
      <p className="text-2">{t('spkDrillHint')}</p>
      <div className="chips">
        {DRILL_PRESETS.map((p) => (
          <button key={p} className="chip" onClick={() => void run(p)} disabled={loading}>
            {p}
          </button>
        ))}
      </div>
      {loading && <p className="text-2">{t('practiceLoading', { topic: '…' })}</p>}
      {msg && <p className="text-2" style={{ color: 'var(--bad)' }}>{msg}</p>}

      {pack && (
        <>
          {pack.tip && (
            <div className="card" style={{ marginBottom: 12 }}>
              <b>💡 {pack.sound}</b>
              <p className="text-2" style={{ margin: '4px 0 0' }}>{pack.tip}</p>
            </div>
          )}
          {pack.pairs.map((p, i) => (
            <div key={i} className="deck-row">
              <button onClick={() => speak(p.a, 'en')} style={{ minHeight: 'auto' }}>🔊</button>
              <span className="deck-row__main">
                <span className="deck-row__term">
                  {p.a} <span className="text-2">vs</span>{' '}
                  <span onClick={() => speak(p.b, 'en')} role="button">{p.b}</span>
                </span>
                {p.note && <div className="deck-row__meaning">{p.note}</div>}
              </span>
            </div>
          ))}
          {pack.sentences.map((s, i) => (
            <div key={`s${i}`} className="deck-row">
              <button onClick={() => speak(s.en, 'en')} style={{ minHeight: 'auto' }}>🔊</button>
              <span className="deck-row__main">
                <span className="deck-row__term">{s.en}</span>
                <div className="deck-row__meaning">{s.vi}</div>
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
