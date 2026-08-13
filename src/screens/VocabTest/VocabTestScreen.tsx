import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNgsl } from '../../services/dataBundle';
import { setMeta } from '../../services/db';
import { saveSettings } from '../../services/settings';
import { speak } from '../../services/tts';
import { useI18n, type MsgKey } from '../../i18n';

const PER_BAND = 12;
const BAND_SIZE: Record<number, number> = { 1: 1000, 2: 1000, 3: 801 };

interface Item {
  word: string;
  band: number;
}

/** Ước lượng vốn từ: sampling ngẫu nhiên theo band NGSL, biết/không → nội suy. */
export default function VocabTestScreen() {
  const { t } = useI18n();
  const [items, setItems] = useState<Item[]>([]);
  const [idx, setIdx] = useState(0);
  const [known, setKnown] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0 });
  const [done, setDone] = useState(false);

  useEffect(() => {
    void getNgsl().then((ngsl) => {
      if (!ngsl) return;
      const byBand: Record<number, string[]> = { 1: [], 2: [], 3: [] };
      for (const [w, b] of Object.entries(ngsl.words)) byBand[b]?.push(w);
      const picked: Item[] = [];
      for (const b of [1, 2, 3]) {
        const pool = byBand[b].sort(() => 0.5 - Math.random()).slice(0, PER_BAND);
        picked.push(...pool.map((word) => ({ word, band: b })));
      }
      setItems(picked);
    });
  }, []);

  const result = useMemo(() => {
    if (!done) return null;
    let estimated = 0;
    for (const b of [1, 2, 3]) estimated += (known[b] / PER_BAND) * BAND_SIZE[b];
    const est = Math.round(estimated / 50) * 50;
    const level = est < 800 ? 'beginner' : est < 1800 ? 'intermediate' : 'advanced';
    return { est, level };
  }, [done, known]);

  useEffect(() => {
    if (!result) return;
    saveSettings({ practiceLevel: result.level });
    void setMeta('vocabLevel', { estimated: result.est, level: result.level, at: Date.now() });
  }, [result]);

  function answer(knows: boolean) {
    const it = items[idx];
    if (knows) setKnown((k) => ({ ...k, [it.band]: k[it.band] + 1 }));
    if (idx + 1 >= items.length) setDone(true);
    else setIdx(idx + 1);
  }

  if (items.length === 0) return null;

  if (done && result) {
    return (
      <div className="card" style={{ textAlign: 'center', marginTop: 48 }}>
        <p className="hero-line">
          <span className="hl tabular">{t('vtResult', { n: result.est })}</span>
        </p>
        <p className="text-2">
          {t('vtLevelSet', { level: t(`level_${result.level}` as MsgKey) })}
        </p>
        <Link to="/practice/topic" className="btn-primary">
          {t('practiceTopic')} →
        </Link>
      </div>
    );
  }

  const it = items[idx];
  return (
    <div className="session-inner">
      <div className="session-top">
        <div className="session-bar">
          <i style={{ width: `${(idx / items.length) * 100}%` }} />
        </div>
        <span className="tabular text-2">
          {idx + 1}/{items.length}
        </span>
      </div>
      <p className="text-2">{t('vtHint')}</p>
      <div className="fc" style={{ minHeight: 220 }}>
        <div className="fc__head">{it.word}</div>
        <button
          className="btn"
          style={{ margin: '10px auto 0', width: 'auto' }}
          onClick={() => speak(it.word, 'en')}
        >
          🔊
        </button>
      </div>
      <div className="rate-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <button className="rate rate--good" onClick={() => answer(true)}>
          {t('vtKnow')}
        </button>
        <button className="rate rate--again" onClick={() => answer(false)}>
          {t('vtDontKnow')}
        </button>
      </div>
    </div>
  );
}
