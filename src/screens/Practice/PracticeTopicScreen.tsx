import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { dailyTopic } from '../../core/dailyTopic';
import { dedupeKey } from '../../core/importExport';
import { createCard } from '../../core/srs';
import type { PracticePack } from '../../core/types';
import { hasAiKey } from '../../services/ai/client';
import { generatePractice } from '../../services/ai/practice';
import { getAllCards, listPacks, putCard, type PackEntry } from '../../services/db';
import { getSettings, saveSettings } from '../../services/settings';
import { getWeakWords } from '../../services/stats';
import { queueSync } from '../../services/sync';
import { speak } from '../../services/tts';
import { useI18n, type MsgKey } from '../../i18n';

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
type Tab = 'vocab' | 'phrases' | 'dialogue' | 'passage';

export default function PracticeTopicScreen() {
  const { t } = useI18n();
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState(() => getSettings().practiceLevel);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pack, setPack] = useState<PracticePack | null>(null);
  const [tab, setTab] = useState<Tab>('vocab');
  const [recent, setRecent] = useState<PackEntry[]>([]);
  const [weakTop, setWeakTop] = useState<string[]>([]);
  const [deckKeys, setDeckKeys] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());
  const keyReady = hasAiKey();
  const today = dailyTopic(Date.now());

  useEffect(() => {
    void listPacks(6).then(setRecent);
    void getWeakWords().then((m) =>
      setWeakTop(
        Object.entries(m)
          .filter(([, v]) => v.misses > 0)
          .sort((a, b) => b[1].misses - a[1].misses)
          .slice(0, 12)
          .map(([w]) => w),
      ),
    );
    void getAllCards().then((deck) => setDeckKeys(new Set(deck.map(dedupeKey))));
  }, []);

  async function run(topicStr: string, words?: string[]) {
    if (!topicStr.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const { pack: p } = await generatePractice({ topic: topicStr, level, words });
      setPack(p);
      setTab('vocab');
      setTopic(topicStr);
      void listPacks(6).then(setRecent);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function saveToDeck(v: PracticePack['vocab'][number]) {
    const card = createCard(
      {
        term: v.term,
        meaning: v.meaning,
        lang: 'en',
        ipa: v.ipa,
        example: v.example,
        topic: pack?.topic,
      },
      Date.now(),
    );
    if (deckKeys.has(dedupeKey(card))) return;
    await putCard(card);
    queueSync();
    setDeckKeys((s) => new Set(s).add(dedupeKey(card)));
    setAdded((s) => new Set(s).add(v.term));
  }

  const tabs = useMemo(
    () =>
      [
        ['vocab', 'practiceTabVocab'],
        ['phrases', 'practiceTabPhrases'],
        ['dialogue', 'practiceTabDialogue'],
        ['passage', 'practiceTabPassage'],
      ] as [Tab, MsgKey][],
    [],
  );

  return (
    <div>
      <h1 className="screen-title">{t('practiceTopic')}</h1>

      {!keyReady && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p className="text-2" style={{ margin: 0 }}>
            {t('practiceNeedKey')} <Link to="/settings">{t('tabSettings')} →</Link>
          </p>
        </div>
      )}

      <div className="toolbar">
        <input
          className="input"
          style={{ flex: 1, minWidth: 160 }}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void run(topic)}
          placeholder={t('practiceTopicPh')}
          disabled={!keyReady}
        />
        <button
          className="btn-primary"
          style={{ width: 'auto' }}
          onClick={() => void run(topic)}
          disabled={!keyReady || loading || !topic.trim()}
        >
          {loading ? '…' : t('practiceGo')}
        </button>
      </div>

      <div className="chips">
        {LEVELS.map((l) => (
          <button
            key={l}
            className={`chip${level === l ? ' active' : ''}`}
            onClick={() => {
              setLevel(l);
              saveSettings({ practiceLevel: l });
            }}
          >
            {t(`level_${l}` as MsgKey)}
          </button>
        ))}
      </div>

      <div className="chips">
        <button className="chip" onClick={() => void run(today)} disabled={!keyReady || loading}>
          🎲 {today}
        </button>
        {weakTop.length >= 3 && (
          <button
            className="chip"
            onClick={() => void run(t('practiceWeakTopic'), weakTop)}
            disabled={!keyReady || loading}
          >
            🎯 {t('practiceWeakChip', { n: weakTop.length })}
          </button>
        )}
        {recent.map((r) => (
          <button
            key={r.key}
            className="chip"
            onClick={() => {
              setPack(r.pack);
              setTopic(r.pack.topic);
              setTab('vocab');
            }}
          >
            {r.pack.topic}
          </button>
        ))}
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="text-2">{t('practiceLoading', { topic })}</p>
        </div>
      )}
      {error && (
        <div className="card" style={{ borderColor: 'var(--bad)', marginBottom: 12 }}>
          <p style={{ color: 'var(--bad)', margin: 0 }}>{error}</p>
        </div>
      )}

      {pack && !loading && (
        <>
          <div className="chips">
            {tabs.map(([k, label]) => (
              <button
                key={k}
                className={`chip${tab === k ? ' active' : ''}`}
                onClick={() => setTab(k)}
              >
                {t(label)}
              </button>
            ))}
          </div>

          {tab === 'vocab' &&
            pack.vocab.map((v) => {
              const inDeck =
                added.has(v.term) || deckKeys.has(dedupeKey({ term: v.term, lang: 'en' }));
              return (
                <div key={v.term} className="deck-row">
                  <span onClick={() => speak(v.term, 'en')} role="button" aria-label={t('listen')}>
                    🔊
                  </span>
                  <span className="deck-row__main">
                    <span className="deck-row__term">{v.term}</span>
                    {v.ipa && <span className="deck-row__ipa">/{v.ipa}/</span>}
                    <div className="deck-row__meaning">{v.meaning}</div>
                    {v.example && (
                      <div className="text-2" style={{ fontSize: 13 }}>
                        “{v.example}”
                      </div>
                    )}
                  </span>
                  <button
                    className="btn"
                    onClick={() => void saveToDeck(v)}
                    disabled={inDeck}
                    aria-label={t('practiceSave')}
                  >
                    {inDeck ? '✓' : '＋'}
                  </button>
                </div>
              );
            })}

          {tab === 'phrases' &&
            pack.phrases.map((p, i) => (
              <div key={i} className="deck-row">
                <span onClick={() => speak(p.en, 'en')} role="button" aria-label={t('listen')}>
                  🔊
                </span>
                <span className="deck-row__main">
                  <span className="deck-row__term">{p.en}</span>
                  <div className="deck-row__meaning">{p.vi}</div>
                </span>
              </div>
            ))}

          {tab === 'dialogue' &&
            pack.dialogue.map((d, i) => (
              <div key={i} className="deck-row">
                <span onClick={() => speak(d.en, 'en')} role="button" aria-label={t('listen')}>
                  🔊
                </span>
                <span className="deck-row__main">
                  <span className="deck-row__term">
                    <span style={{ color: 'var(--accent)' }}>{d.speaker}:</span> {d.en}
                  </span>
                  <div className="deck-row__meaning">{d.vi}</div>
                </span>
              </div>
            ))}

          {tab === 'passage' &&
            pack.passage.map((p, i) => (
              <div key={i} className="deck-row">
                <span onClick={() => speak(p.en, 'en')} role="button" aria-label={t('listen')}>
                  🔊
                </span>
                <span className="deck-row__main">
                  <span className="deck-row__term">{p.en}</span>
                  <div className="deck-row__meaning">{p.vi}</div>
                </span>
              </div>
            ))}
        </>
      )}
    </div>
  );
}
