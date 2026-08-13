import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ReviewRating, VocabCard } from '../../core/types';
import { getDueCards, previewGaps, schedule } from '../../core/srs';
import { getAllCards, putCard } from '../../services/db';
import { recordSession, type SessionOutcome } from '../../services/gamify';
import { getSettings, saveSettings } from '../../services/settings';
import { speak } from '../../services/tts';
import { useI18n } from '../../i18n';

const TWO_MIN_MS = 120_000;
const RATINGS: ReviewRating[] = ['again', 'hard', 'good', 'easy'];

/** "10p / 3g / 6ng" — nhãn khoảng chờ trên nút rating. */
function gapLabel(ms: number): string {
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${Math.max(1, m)}p`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}g`;
  return `${Math.round(h / 24)}ng`;
}

type Phase = 'setup' | 'run' | 'done';
type Source = 'due' | 'all';

export default function ReviewScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const twoMin = params.get('t') === '2m';

  const [deck, setDeck] = useState<VocabCard[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<Phase>('setup');
  const [source, setSource] = useState<Source>('due');
  const [topic, setTopic] = useState('');

  const [queue, setQueue] = useState<VocabCard[]>([]);
  const [done, setDone] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [counts, setCounts] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [autoSpeak, setAutoSpeak] = useState(() => getSettings().reviewAutoSpeak);
  const [outcome, setOutcome] = useState<SessionOutcome | null>(null);

  // counts mới nhất + cờ "đã ghi phiên" (mọi lối ra đều gọi finish đúng 1 lần)
  const countsRef = useRef(counts);
  countsRef.current = counts;
  const recordedRef = useRef(false);

  // Swipe kiểu Tinder — transform trực tiếp lên DOM (không re-render mỗi move)
  const cardRef = useRef<HTMLDivElement>(null);
  const stampGoodRef = useRef<HTMLSpanElement>(null);
  const stampBadRef = useRef<HTMLSpanElement>(null);
  const dragRef = useRef({
    id: -1,
    startX: 0,
    dx: 0,
    lastX: 0,
    lastT: 0,
    vel: 0, // px/ms — để nhận cú "hất" nhanh dù kéo chưa xa
    moved: false,
    busy: false, // đang animate bay ra — khóa input
  });

  const finish = useCallback(() => {
    setPhase('done');
    if (recordedRef.current) return;
    recordedRef.current = true;
    const c = countsRef.current;
    const total = c.again + c.hard + c.good + c.easy;
    const correct = c.hard + c.good + c.easy;
    if (total > 0) void recordSession({ total, correct }, Date.now()).then(setOutcome);
  }, []);

  useEffect(() => {
    void getAllCards().then((cards) => {
      setDeck(cards);
      setLoaded(true);
    });
  }, []);

  const topics = useMemo(() => {
    const s = new Set<string>();
    deck.forEach((c) => c.topic && s.add(c.topic));
    return [...s].sort();
  }, [deck]);

  const dueCount = useMemo(() => getDueCards(deck, Date.now()).length, [deck]);

  const start = useCallback(
    (src: Source, tp: string) => {
      const now = Date.now();
      let cards =
        src === 'due'
          ? getDueCards(deck, now)
          : [...deck].sort(() => 0.5 - Math.random()).slice(0, 20);
      if (tp) cards = cards.filter((c) => c.topic === tp);
      if (cards.length === 0) return;
      setQueue(cards);
      setDone(0);
      setCounts({ again: 0, hard: 0, good: 0, easy: 0 });
      setFlipped(false);
      setOutcome(null);
      recordedRef.current = false;
      setEndsAt(twoMin ? now + TWO_MIN_MS : null);
      setPhase('run');
    },
    [deck, twoMin],
  );

  // Chế độ 2 phút từ Home: tự bắt đầu với thẻ đến hạn
  useEffect(() => {
    if (twoMin && loaded && phase === 'setup') start('due', '');
  }, [twoMin, loaded, phase, start]);

  // Đồng hồ 2 phút
  useEffect(() => {
    if (phase !== 'run' || endsAt == null) return;
    const iv = setInterval(() => {
      setTick((x) => x + 1);
      if (Date.now() >= endsAt) finish();
    }, 500);
    return () => clearInterval(iv);
  }, [phase, endsAt, finish]);

  const current = queue[0];

  // Tự đọc term khi hiện thẻ mới
  useEffect(() => {
    if (phase === 'run' && current && autoSpeak && !flipped) speak(current.term, current.lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, phase]);

  const gaps = useMemo(
    () => (current ? previewGaps(current, Date.now()) : null),
    [current],
  );

  const rate = useCallback(
    (rating: ReviewRating) => {
      if (!current) return;
      const updated = schedule(current, rating, Date.now());
      void putCard(updated); // ghi ngay — reload giữa phiên không mất tiến độ (AC)
      setCounts((c) => ({ ...c, [rating]: c[rating] + 1 }));
      setFlipped(false);
      setQueue((q) => {
        const rest = q.slice(1);
        // Quên → gặp lại cuối phiên này
        return rating === 'again' ? [...rest, updated] : rest;
      });
      if (rating !== 'again') setDone((d) => d + 1);
      if (queue.length === 1 && rating !== 'again') finish();
    },
    [current, queue.length, finish],
  );

  // ---- Swipe helpers ----

  const resetStamps = useCallback(() => {
    if (stampGoodRef.current) stampGoodRef.current.style.opacity = '0';
    if (stampBadRef.current) stampBadRef.current.style.opacity = '0';
  }, []);

  const springBack = useCallback(() => {
    const el = cardRef.current;
    if (el) {
      el.style.transition = 'transform .18s ease-out';
      el.style.transform = '';
    }
    resetStamps();
    dragRef.current.dx = 0;
  }, [resetStamps]);

  /** Thẻ bay khỏi màn hình rồi mới chấm — cảm giác Tinder. */
  const flyOut = useCallback(
    (dir: 1 | -1) => {
      const el = cardRef.current;
      const d = dragRef.current;
      if (!el || d.busy) return;
      d.busy = true;
      el.style.transition = 'transform .22s ease-out, opacity .22s ease-out';
      el.style.transform = `translateX(${dir * (window.innerWidth || 480)}px) rotate(${dir * 18}deg)`;
      el.style.opacity = '0';
      setTimeout(() => {
        rate(dir === 1 ? 'good' : 'again');
        const next = cardRef.current;
        if (next) {
          // Thẻ kế vào nhẹ nhàng: scale .96 → 1
          next.style.transition = 'none';
          next.style.transform = 'scale(.96)';
          next.style.opacity = '1';
          requestAnimationFrame(() => {
            next.style.transition = 'transform .18s ease-out';
            next.style.transform = '';
          });
        }
        resetStamps();
        d.busy = false;
        d.dx = 0;
      }, 220);
    },
    [rate, resetStamps],
  );

  // Phím tắt kiểu Anki: Space lật, 1-4 chấm
  useEffect(() => {
    if (phase !== 'run') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
        rate(RATINGS[Number(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, flipped, rate]);

  // ---- render ----

  if (phase === 'setup') {
    return (
      <div>
        <h1 className="screen-title">{t('studyReview')}</h1>
        <div className="chips">
          <button
            className={`chip${source === 'due' ? ' active' : ''}`}
            onClick={() => setSource('due')}
          >
            {t('reviewSetupDue', { n: dueCount })}
          </button>
          <button
            className={`chip${source === 'all' ? ' active' : ''}`}
            onClick={() => setSource('all')}
          >
            {t('reviewSetupAll')}
          </button>
          {topics.length > 0 && (
            <select
              className="input"
              style={{ width: 'auto' }}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              <option value="">{t('deckAllTopics')}</option>
              {topics.map((tp) => (
                <option key={tp} value={tp}>
                  {tp}
                </option>
              ))}
            </select>
          )}
        </div>
        {loaded && dueCount === 0 && source === 'due' ? (
          <p className="text-2">{t('reviewNothingDue')}</p>
        ) : null}
        <button
          className="btn-primary"
          onClick={() => start(source, topic)}
          disabled={!loaded || (source === 'due' ? dueCount === 0 : deck.length === 0)}
        >
          {t('reviewStart')}
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    const total = counts.again + counts.hard + counts.good + counts.easy;
    const stillDue = getDueCards(deck, Date.now()).length;
    return (
      <div className="session-full">
        <div className="session-inner">
          <div className="card" style={{ textAlign: 'center', marginTop: 48 }}>
            <p className="hero-line">
              <span className="hl">{t('summaryReviewed', { n: total })}</span>
            </p>
            <p className="text-2 tabular">
              {t('rateAgain')} {counts.again} · {t('rateHard')} {counts.hard} · {t('rateGood')}{' '}
              {counts.good} · {t('rateEasy')} {counts.easy}
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
              {stillDue > 0 && (
                <button
                  className="btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    void getAllCards().then((cards) => {
                      setDeck(cards);
                      setPhase('setup');
                    });
                  }}
                >
                  {t('summaryContinue')}
                </button>
              )}
              <button className="btn" style={{ flex: 1 }} onClick={() => navigate('/')}>
                {t('summaryHome')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;
  const progress = done / (done + queue.length);
  const remainMs = endsAt != null ? Math.max(0, endsAt - Date.now()) : null;
  void tick;

  return (
    <div className="session-full">
      <div className="session-inner">
        <div className="session-top">
          <button onClick={finish} aria-label={t('formCancel')}>
            ✕
          </button>
          <div className="session-bar">
            <i style={{ width: `${progress * 100}%` }} />
          </div>
          {remainMs != null ? (
            <span className="tabular" style={{ fontWeight: 600 }}>
              ⚡{Math.floor(remainMs / 60000)}:{String(Math.floor((remainMs % 60000) / 1000)).padStart(2, '0')}
            </span>
          ) : (
            <span className="tabular text-2">{queue.length}</span>
          )}
          <button
            onClick={() => {
              const next = !autoSpeak;
              setAutoSpeak(next);
              saveSettings({ reviewAutoSpeak: next });
            }}
            title={t('reviewAutoSpeak')}
            style={{ opacity: autoSpeak ? 1 : 0.4 }}
          >
            🔊
          </button>
        </div>

        <div
          ref={cardRef}
          className="fc"
          onClick={() => {
            const d = dragRef.current;
            if (d.moved || d.busy) {
              d.moved = false; // click "đuôi" sau một cú kéo — nuốt, không lật
              return;
            }
            setFlipped((f) => !f);
          }}
          onPointerDown={(e) => {
            const d = dragRef.current;
            if (!flipped || d.busy) return;
            d.id = e.pointerId;
            d.startX = e.clientX;
            d.lastX = e.clientX;
            d.lastT = e.timeStamp;
            d.vel = 0;
            d.moved = false;
            // Giữ pointer kể cả khi ngón tay rời khỏi thẻ — mấu chốt để mobile không đứt gesture
            e.currentTarget.setPointerCapture(e.pointerId);
            if (cardRef.current) cardRef.current.style.transition = 'none';
          }}
          onPointerMove={(e) => {
            const d = dragRef.current;
            if (d.id !== e.pointerId || d.busy) return;
            const dx = e.clientX - d.startX;
            const dt = e.timeStamp - d.lastT;
            if (dt > 0) d.vel = (e.clientX - d.lastX) / dt;
            d.lastX = e.clientX;
            d.lastT = e.timeStamp;
            d.dx = dx;
            if (Math.abs(dx) > 8) d.moved = true;
            const el = cardRef.current;
            if (el) el.style.transform = `translateX(${dx}px) rotate(${dx / 22}deg)`;
            const p = String(Math.min(1, Math.abs(dx) / 90));
            if (stampGoodRef.current) stampGoodRef.current.style.opacity = dx > 0 ? p : '0';
            if (stampBadRef.current) stampBadRef.current.style.opacity = dx < 0 ? p : '0';
          }}
          onPointerUp={(e) => {
            const d = dragRef.current;
            if (d.id !== e.pointerId) return;
            d.id = -1;
            if (d.busy) return;
            const width = cardRef.current?.offsetWidth ?? 320;
            const threshold = Math.min(110, width * 0.32);
            const flick =
              Math.abs(d.vel) > 0.55 && Math.abs(d.dx) > 24 && Math.sign(d.vel) === Math.sign(d.dx);
            if (Math.abs(d.dx) > threshold || flick) flyOut(d.dx > 0 ? 1 : -1);
            else springBack();
          }}
          onPointerCancel={() => {
            dragRef.current.id = -1;
            if (!dragRef.current.busy) springBack();
          }}
        >
          {flipped && (
            <>
              <span ref={stampGoodRef} className="fc__stamp fc__stamp--good">
                {t('rateGood').toUpperCase()} ✓
              </span>
              <span ref={stampBadRef} className="fc__stamp fc__stamp--bad">
                {t('rateAgain').toUpperCase()} ✗
              </span>
            </>
          )}
          <div className="fc__head">{current.term}</div>
          {current.ipa && <div className="fc__ipa">/{current.ipa}/</div>}
          <button
            className="btn"
            style={{ margin: '10px auto 0', width: 'auto' }}
            onClick={(e) => {
              e.stopPropagation();
              speak(current.term, current.lang);
            }}
          >
            🔊
          </button>

          {flipped && (
            <>
              <hr style={{ width: 48, border: 'none', borderTop: `1px solid var(--border)`, margin: '14px auto' }} />
              <div className="fc__meaning">{current.meaning}</div>
              {current.example && <div className="fc__example">“{current.example}”</div>}
              {current.image && <img className="fc__img" src={current.image} alt="" />}
              {current.context && (
                <div className="fc__src">
                  {t('clozeSourceContext')}: “{current.context}”
                </div>
              )}
            </>
          )}
          {!flipped && <div className="fc__hint">{t('reviewFlipHint')}</div>}
        </div>

        {flipped && gaps && (
          <div className="rate-row">
            {RATINGS.map((r, i) => (
              <button key={r} className={`rate rate--${r}`} onClick={() => rate(r)}>
                {t(r === 'again' ? 'rateAgain' : r === 'hard' ? 'rateHard' : r === 'good' ? 'rateGood' : 'rateEasy')}
                <small className="tabular">
                  {gapLabel(gaps[r])} · {i + 1}
                </small>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
