import { useEffect, useMemo, useRef, useState } from 'react';
import { getDueCards } from '../../core/srs';
import { activeSentence, estimateSentenceStarts } from '../../core/transcript';
import type { PracticePack } from '../../core/types';
import { hasAiKey } from '../../services/ai/client';
import { playQueue, seek, toggle, usePlayer } from '../../services/audioPlayer';
import { getAllCards, listPacks, type PackEntry } from '../../services/db';
import { createPlaylist, type PlayItem, type PlaylistMode } from '../../services/playlist';
import { speak } from '../../services/tts';
import {
  fetchFeed,
  listArticles,
  loadArticle,
  translateArticle,
  trackFor,
  VOA_PROGRAMS,
  type VoaArticle,
  type VoaFeedItem,
} from '../../services/voa';
import { useI18n, type MsgKey } from '../../i18n';

type Source = 'voa' | 'packs' | 'deck';
const GAPS = [600, 1200, 2500];

/** Player TTS (SpeechSynthesis) dùng cho Packs + Deck — không có file audio thật. */
function TtsPlayer({ items, title }: { items: PlayItem[]; title: string }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<PlaylistMode>('en-vi');
  const [gap, setGap] = useState(1200);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const plRef = useRef<ReturnType<typeof createPlaylist> | null>(null);

  useEffect(() => {
    const pl = createPlaylist(items, { mode, gapMs: gap, title, onIndex: setIdx, onState: setPlaying });
    plRef.current = pl;
    return () => pl.stop();
  }, [items, mode, gap, title]);

  const cur = items[idx];
  if (!cur) return null;

  return (
    <div>
      <div className="chips">
        <button className={`chip${mode === 'en' ? ' active' : ''}`} onClick={() => setMode('en')}>
          {t('listenModeEn')}
        </button>
        <button className={`chip${mode === 'en-vi' ? ' active' : ''}`} onClick={() => setMode('en-vi')}>
          {t('listenModeEnVi')}
        </button>
        <select
          className="input"
          style={{ width: 'auto', marginLeft: 'auto' }}
          value={gap}
          onChange={(e) => setGap(Number(e.target.value))}
          aria-label={t('listenGap')}
        >
          {GAPS.map((g) => (
            <option key={g} value={g}>
              {t('listenGap')} {(g / 1000).toFixed(1)}s
            </option>
          ))}
        </select>
      </div>

      <div className="fc" style={{ minHeight: 180, cursor: 'default' }}>
        <div className="fc__head" style={{ fontSize: 22 }}>
          {cur.en}
        </div>
        {mode === 'en-vi' && cur.vi && <div className="fc__example">{cur.vi}</div>}
        <div className="text-2 tabular" style={{ marginTop: 10, fontSize: 13 }}>
          {idx + 1}/{items.length}
        </div>
      </div>

      <div className="rate-row" style={{ gridTemplateColumns: '1fr 2fr 1fr' }}>
        <button className="rate" onClick={() => plRef.current?.prev()}>
          ⏮
        </button>
        <button
          className="rate rate--good"
          onClick={() => (playing ? plRef.current?.pause() : plRef.current?.play(idx))}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <button className="rate" onClick={() => plRef.current?.next()}>
          ⏭
        </button>
      </div>
    </div>
  );
}

/** Bài VOA: audio thật + transcript chạy theo (karaoke, chạm câu để tua). */
function VoaArticleView({
  article,
  onBack,
  onTranslate,
  translating,
}: {
  article: VoaArticle;
  onBack: () => void;
  onTranslate: () => void;
  translating: boolean;
}) {
  const { t } = useI18n();
  const player = usePlayer();
  const listRef = useRef<HTMLDivElement>(null);

  const isThis = player.queue[player.index]?.link === article.url;
  const starts = useMemo(
    () => (isThis ? estimateSentenceStarts(article.sentences, player.duration) : []),
    [isThis, article.sentences, player.duration],
  );
  const active = isThis && player.duration > 0 ? activeSentence(starts, player.time) : -1;

  // Tự cuộn câu đang phát vào giữa màn hình
  useEffect(() => {
    if (active < 0) return;
    listRef.current?.children[active]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [active]);

  return (
    <>
      <button className="btn" onClick={onBack}>
        {t('listenBack')}
      </button>
      <h2 style={{ marginTop: 12 }}>{article.title}</h2>
      <p className="fc__src" style={{ marginTop: 0 }}>
        {t('listenCredit')}
      </p>

      <div className="row" style={{ marginBottom: 10 }}>
        {article.audio ? (
          <button
            className="btn-primary"
            style={{ flex: 1 }}
            onClick={() => (isThis ? toggle() : playQueue([trackFor({ title: article.title, link: article.url, audio: article.audio })]))}
          >
            {isThis && player.playing ? t('listenPause') : t('listenPlayArticle')}
          </button>
        ) : (
          <span className="text-2">{t('listenNoAudio')}</span>
        )}
        {hasAiKey() && !article.vi && (
          <button className="btn" onClick={onTranslate} disabled={translating}>
            {translating ? t('listenTranslating') : t('listenTranslate')}
          </button>
        )}
      </div>

      <div ref={listRef}>
        {article.sentences.map((s, i) => (
          <p
            key={i}
            className={`sent${i === active ? ' sent--on' : ''}`}
            onClick={() => {
              if (isThis && starts[i] != null) seek(starts[i] + 0.05);
              else speak(s, 'en');
            }}
          >
            {s}
            {article.vi?.[i] && (
              <span className="text-2" style={{ display: 'block', fontSize: 14 }}>
                {article.vi[i]}
              </span>
            )}
          </p>
        ))}
      </div>
    </>
  );
}

export default function ListenScreen() {
  const { t } = useI18n();
  const [source, setSource] = useState<Source>('voa');

  // VOA
  const [program, setProgram] = useState(VOA_PROGRAMS[0]);
  const [feed, setFeed] = useState<VoaFeedItem[]>([]);
  const [saved, setSaved] = useState<VoaArticle[]>([]);
  const [feedErr, setFeedErr] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [article, setArticle] = useState<VoaArticle | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [msg, setMsg] = useState('');

  // Packs / Deck
  const [packs, setPacks] = useState<PackEntry[]>([]);
  const [pack, setPack] = useState<PracticePack | null>(null);
  const [section, setSection] = useState<'passage' | 'dialogue'>('passage');
  const [deckItems, setDeckItems] = useState<PlayItem[] | null>(null);
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    void listArticles().then(setSaved);
    void listPacks(10).then(setPacks);
    void getAllCards().then((deck) => setDueCount(getDueCards(deck, Date.now()).length));
  }, []);

  useEffect(() => {
    setLoadingFeed(true);
    setFeedErr(false);
    setFeed([]);
    fetchFeed(program.url)
      .then(setFeed)
      .catch(() => setFeedErr(true))
      .finally(() => setLoadingFeed(false));
  }, [program]);

  async function openArticle(item: VoaFeedItem) {
    setLoadingArticle(true);
    setMsg('');
    try {
      setArticle(await loadArticle(item));
      void listArticles().then(setSaved);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingArticle(false);
    }
  }

  async function translate() {
    if (!article) return;
    setTranslating(true);
    setMsg('');
    try {
      setArticle(await translateArticle(article));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setTranslating(false);
    }
  }

  const packItems = useMemo<PlayItem[]>(() => {
    if (!pack) return [];
    return section === 'passage'
      ? pack.passage.map((p) => ({ en: p.en, vi: p.vi }))
      : pack.dialogue.map((d) => ({ en: d.en, vi: d.vi }));
  }, [pack, section]);

  return (
    <div>
      <h1 className="screen-title">{t('listenTitle')}</h1>

      <div className="chips">
        {(
          [
            ['voa', 'listenVoa'],
            ['packs', 'listenPacks'],
            ['deck', 'listenDeck'],
          ] as [Source, MsgKey][]
        ).map(([k, label]) => (
          <button key={k} className={`chip${source === k ? ' active' : ''}`} onClick={() => setSource(k)}>
            {t(label)}
          </button>
        ))}
      </div>

      {msg && (
        <p className="text-2" style={{ color: 'var(--bad)' }}>
          {msg}
        </p>
      )}

      {/* ---- VOA ---- */}
      {source === 'voa' && !article && (
        <>
          <div className="chips">
            {VOA_PROGRAMS.map((p) => (
              <button
                key={p.url}
                className={`chip${program.url === p.url ? ' active' : ''}`}
                onClick={() => setProgram(p)}
              >
                {p.name}
              </button>
            ))}
          </div>
          <p className="text-2" style={{ fontSize: 12, marginTop: 0 }}>
            {t('listenArchiveNote')}
          </p>

          {feed.length > 0 && (
            <button
              className="btn-primary"
              style={{ marginBottom: 12 }}
              onClick={() => playQueue(feed.map(trackFor))}
            >
              {t('listenPlayAll', { n: feed.length })}
            </button>
          )}

          {loadingFeed && <p className="text-2">{t('listenLoading')}</p>}
          {feedErr && <p className="text-2">{t('listenFeedErr')}</p>}
          {feed.map((it) => (
            <div key={it.link} className="deck-row">
              <button
                onClick={() => playQueue([trackFor(it)])}
                aria-label={t('listenPlayArticle')}
                style={{ minHeight: 'auto' }}
              >
                {it.audio ? '▶' : '📄'}
              </button>
              <button
                className="deck-row__main"
                style={{ minHeight: 'auto', background: 'none' }}
                onClick={() => void openArticle(it)}
              >
                <span className="deck-row__term">{it.title}</span>
                {it.pubDate && (
                  <div className="deck-row__meaning">{new Date(it.pubDate).toLocaleDateString()}</div>
                )}
              </button>
            </div>
          ))}

          {saved.length > 0 && (
            <>
              <h3 style={{ marginTop: 16 }}>{t('listenSaved')}</h3>
              {saved.map((a) => (
                <button
                  key={a.url}
                  className="deck-row"
                  onClick={() => void openArticle({ title: a.title, link: a.url, audio: a.audio })}
                >
                  <span aria-hidden>💾</span>
                  <span className="deck-row__main">
                    <span className="deck-row__term">{a.title}</span>
                  </span>
                </button>
              ))}
            </>
          )}
          {loadingArticle && <p className="text-2">{t('listenLoading')}</p>}
        </>
      )}

      {source === 'voa' && article && (
        <VoaArticleView
          article={article}
          onBack={() => setArticle(null)}
          onTranslate={() => void translate()}
          translating={translating}
        />
      )}

      {/* ---- Packs ---- */}
      {source === 'packs' && (
        <>
          {packs.length === 0 && <p className="text-2">{t('listenNoPacks')}</p>}
          <div className="chips">
            {packs.map((p) => (
              <button
                key={p.key}
                className={`chip${pack === p.pack ? ' active' : ''}`}
                onClick={() => setPack(p.pack)}
              >
                {p.pack.topic}
              </button>
            ))}
          </div>
          {pack && (
            <>
              <div className="chips">
                <button
                  className={`chip${section === 'passage' ? ' active' : ''}`}
                  onClick={() => setSection('passage')}
                >
                  {t('practiceTabPassage')}
                </button>
                <button
                  className={`chip${section === 'dialogue' ? ' active' : ''}`}
                  onClick={() => setSection('dialogue')}
                >
                  {t('practiceTabDialogue')}
                </button>
              </div>
              {packItems.length > 0 && <TtsPlayer items={packItems} title={pack.topic} />}
            </>
          )}
        </>
      )}

      {/* ---- Deck (nghe thụ động thẻ đến hạn) ---- */}
      {source === 'deck' &&
        (deckItems ? (
          <TtsPlayer items={deckItems} title={t('listenDeck')} />
        ) : (
          <>
            {dueCount === 0 && <p className="text-2">{t('listenNoDue')}</p>}
            <button
              className="btn-primary"
              disabled={dueCount === 0}
              onClick={() => {
                void getAllCards().then((deck) => {
                  const due = getDueCards(deck, Date.now(), 20);
                  setDeckItems(due.map((c) => ({ en: c.term, vi: c.meaning })));
                });
              }}
            >
              {t('listenDeckStart', { n: Math.min(20, dueCount) })}
            </button>
          </>
        ))}
    </div>
  );
}
