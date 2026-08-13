import { useEffect, useMemo, useRef, useState } from 'react';
import { getDueCards } from '../../core/srs';
import type { PracticePack } from '../../core/types';
import { hasAiKey } from '../../services/ai/client';
import { getAllCards, listPacks, type PackEntry } from '../../services/db';
import { createPlaylist, type PlayItem, type PlaylistMode } from '../../services/playlist';
import { speak } from '../../services/tts';
import {
  fetchFeed,
  listArticles,
  loadArticle,
  proxied,
  translateArticle,
  type VoaArticle,
  type VoaFeedItem,
} from '../../services/voa';
import { useI18n, type MsgKey } from '../../i18n';

type Source = 'voa' | 'packs' | 'deck';
const GAPS = [600, 1200, 2500];

/** Player TTS dùng chung cho Packs + Deck. */
function TtsPlayer({ items, title }: { items: PlayItem[]; title: string }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<PlaylistMode>('en-vi');
  const [gap, setGap] = useState(1200);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const plRef = useRef<ReturnType<typeof createPlaylist> | null>(null);

  useEffect(() => {
    const pl = createPlaylist(items, {
      mode,
      gapMs: gap,
      title,
      onIndex: setIdx,
      onState: setPlaying,
    });
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
        <button
          className={`chip${mode === 'en-vi' ? ' active' : ''}`}
          onClick={() => setMode('en-vi')}
        >
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

export default function ListenScreen() {
  const { t } = useI18n();
  const [source, setSource] = useState<Source>('voa');

  // VOA
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
    fetchFeed()
      .then(setFeed)
      .catch(() => setFeedErr(true))
      .finally(() => setLoadingFeed(false));
    void listPacks(10).then(setPacks);
    void getAllCards().then((deck) => setDueCount(getDueCards(deck, Date.now()).length));
  }, []);

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
          <button
            key={k}
            className={`chip${source === k ? ' active' : ''}`}
            onClick={() => setSource(k)}
          >
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
          {loadingFeed && <p className="text-2">{t('listenLoading')}</p>}
          {feedErr && <p className="text-2">{t('listenFeedErr')}</p>}
          {feed.map((it) => (
            <button key={it.link} className="deck-row" onClick={() => void openArticle(it)}>
              <span aria-hidden>{it.audio ? '🎧' : '📄'}</span>
              <span className="deck-row__main">
                <span className="deck-row__term">{it.title}</span>
                {it.pubDate && (
                  <div className="deck-row__meaning">{new Date(it.pubDate).toLocaleDateString()}</div>
                )}
              </span>
            </button>
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
        <>
          <button className="btn" onClick={() => setArticle(null)}>
            {t('listenBack')}
          </button>
          <h2 style={{ marginTop: 12 }}>{article.title}</h2>
          <p className="fc__src" style={{ marginTop: 0 }}>
            {t('listenCredit')}
          </p>
          {article.audio && (
            <audio
              controls
              preload="none"
              src={proxied('audio', article.audio)}
              style={{ width: '100%', margin: '8px 0 12px' }}
            />
          )}
          {hasAiKey() && !article.vi && (
            <button className="btn" onClick={() => void translate()} disabled={translating}>
              {translating ? t('listenTranslating') : t('listenTranslate')}
            </button>
          )}
          <div style={{ marginTop: 10 }}>
            {article.sentences.map((s, i) => (
              <p
                key={i}
                onClick={() => speak(s, 'en')}
                style={{ cursor: 'pointer', margin: '0 0 10px' }}
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
