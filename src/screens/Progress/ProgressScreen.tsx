import { useEffect, useState } from 'react';
import { BADGES, levelOf, type BadgeInput } from '../../core/gamification';
import { dayKey } from '../../core/dayKey';
import { getAllCards } from '../../services/db';
import { loadGamify, type GamifySnapshot } from '../../services/gamify';
import { getWeakWords, type WeakWordMap } from '../../services/stats';
import { useI18n, type MsgKey } from '../../i18n';

const DAY_MS = 86_400_000;
const HEAT_DAYS = 28;

export default function ProgressScreen() {
  const { t } = useI18n();
  const [snap, setSnap] = useState<GamifySnapshot | null>(null);
  const [deckStats, setDeckStats] = useState({ words: 0, learned: 0, due: 0 });
  const [weak, setWeak] = useState<WeakWordMap>({});

  useEffect(() => {
    const now = Date.now();
    void loadGamify(now).then(setSnap);
    void getAllCards().then((deck) =>
      setDeckStats({
        words: deck.length,
        learned: deck.filter((c) => c.reps >= 2).length,
        due: deck.filter((c) => c.due <= now).length,
      }),
    );
    void getWeakWords().then(setWeak);
  }, []);

  if (!snap) return null;

  const now = Date.now();
  const { level, inLevel, perLevel } = levelOf(snap.xp);
  const badgeInput: BadgeInput = {
    words: deckStats.words,
    learned: deckStats.learned,
    attempts: snap.stats.attempts,
    streak: snap.streak,
  };

  const heat = Array.from({ length: HEAT_DAYS }, (_, i) => {
    const key = dayKey(now - (HEAT_DAYS - 1 - i) * DAY_MS);
    return { key, n: snap.days[key]?.attempts ?? 0 };
  });
  const maxHeat = Math.max(1, ...heat.map((h) => h.n));

  const weakTop = Object.entries(weak)
    .filter(([, v]) => v.misses > 0)
    .sort((a, b) => b[1].misses - a[1].misses)
    .slice(0, 10);

  return (
    <div>
      <h1 className="screen-title">{t('progressTitle')}</h1>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="hero-line" style={{ margin: 0 }}>
            <span className="hl">⭐ {t('levelLabel', { n: level })}</span>
          </span>
          <span className="tabular" style={{ fontSize: 22, fontWeight: 800 }}>
            🔥 {snap.streak}
          </span>
        </div>
        <div className="xpbar" style={{ marginTop: 10 }}>
          <i style={{ width: `${(inLevel / perLevel) * 100}%` }} />
        </div>
        <p className="text-2 tabular" style={{ margin: '6px 0 0', fontSize: 13 }}>
          {t('xpToNext', { inLevel, perLevel, next: level + 1 })} · {snap.xp} XP ·{' '}
          {snap.streak > 0 ? t('streakDays') : ''}
        </p>
      </div>

      <div className="statrow" style={{ marginBottom: 12 }}>
        {(
          [
            ['statWords', deckStats.words],
            ['statLearned', deckStats.learned],
            ['statDue', deckStats.due],
          ] as [MsgKey, number][]
        ).map(([k, v]) => (
          <div key={k} className="card" style={{ textAlign: 'center', padding: 10 }}>
            <div className="tabular" style={{ fontSize: 22, fontWeight: 800 }}>
              {v}
            </div>
            <div className="text-2" style={{ fontSize: 12 }}>
              {t(k)}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3>{t('heatTitle')}</h3>
        <div className="heat">
          {heat.map((h) => (
            <i
              key={h.key}
              title={`${h.key}: ${h.n}`}
              style={{ opacity: h.n === 0 ? 0.12 : 0.25 + 0.75 * (h.n / maxHeat) }}
            />
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3>{t('badgesTitle')}</h3>
        <div className="badges">
          {BADGES.map((b) => (
            <div key={b.id} className={`badge${b.ok(badgeInput) ? '' : ' off'}`}>
              <div style={{ fontSize: 22 }}>{b.icon}</div>
              <div style={{ fontSize: 11 }}>{t(`badge_${b.id}` as MsgKey)}</div>
            </div>
          ))}
        </div>
      </div>

      {weakTop.length > 0 && (
        <div className="card">
          <h3>{t('weakTitle')}</h3>
          {weakTop.map(([term, v]) => (
            <div key={term} className="hub-item" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="hub-item__label" style={{ fontWeight: 600 }}>
                {term}
              </span>
              <span className="text-2 tabular" style={{ fontSize: 13 }}>
                ✗ {v.misses}/{v.attempts}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
