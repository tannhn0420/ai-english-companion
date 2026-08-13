import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { levelOf } from '../../core/gamification';
import { dayKey } from '../../core/dayKey';
import { countCards, countDue } from '../../services/db';
import { loadGamify } from '../../services/gamify';
import { getSettings } from '../../services/settings';
import { useI18n } from '../../i18n';

/** Home kiểu widget (DESIGN.md §4.1) — số liệu thật từ IndexedDB + gamify. */
export default function HomeScreen() {
  const { t } = useI18n();
  const [total, setTotal] = useState<number | null>(null);
  const [due, setDue] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [todayDone, setTodayDone] = useState(0);
  const goal = getSettings().dailyGoal;

  useEffect(() => {
    const now = Date.now();
    let alive = true;
    void Promise.all([countCards(), countDue(now), loadGamify(now)]).then(([c, d, g]) => {
      if (!alive) return;
      setTotal(c);
      setDue(d);
      setStreak(g.streak);
      setLevel(levelOf(g.xp).level);
      setTodayDone(g.days[dayKey(now)]?.attempts ?? 0);
      // Badge số thẻ đến hạn trên icon app (nếu trình duyệt hỗ trợ)
      try {
        if (d > 0) void navigator.setAppBadge?.(d);
        else void navigator.clearAppBadge?.();
      } catch {
        /* không hỗ trợ — bỏ qua */
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const empty = total === 0;

  return (
    <div>
      <Link
        to="/progress"
        className="hub-item tabular"
        style={{ marginBottom: 16, color: 'inherit' }}
      >
        <span>🔥 {streak}</span>
        <span>⭐ Lv {level}</span>
        {total !== null && total > 0 && (
          <span className="text-2" style={{ marginLeft: 'auto', fontSize: 13 }}>
            {t('homeTotal', { n: total })} →
          </span>
        )}
      </Link>

      <div className="card" style={{ marginBottom: 16 }}>
        {empty ? (
          <>
            <p className="hero-line">
              <span className="hl">{t('homeDeckEmpty')}</span>
            </p>
            <p className="text-2" style={{ marginTop: 0 }}>
              {t('homeDeckEmptyHint')}
            </p>
            <Link to="/deck" className="btn-primary">
              {t('homeAddWords')}
            </Link>
          </>
        ) : (
          <>
            <p className="hero-line">
              <span className="hl tabular">
                {due > 0 ? t('homeDue', { n: due }) : t('homeNoDue')}
              </span>
            </p>
            <Link to="/review" className="btn-primary">
              {t('homeReviewNow')}
            </Link>
            {due > 0 && (
              <Link
                to="/review?t=2m"
                className="btn"
                style={{ display: 'block', textAlign: 'center', marginTop: 8 }}
              >
                {t('homeTwoMin')}
              </Link>
            )}
            <div className="xpbar" style={{ marginTop: 12 }}>
              <i style={{ width: `${Math.min(100, (todayDone / goal) * 100)}%` }} />
            </div>
            <p className="text-2 tabular" style={{ margin: '6px 0 0', fontSize: 13 }}>
              {t('goalToday', { done: todayDone, goal })}
            </p>
          </>
        )}
      </div>

      <div className="hub-list" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Link to="/quiz" className="card hub-item">
          <span aria-hidden>🎯</span>
          <span className="hub-item__label">{t('homeQuiz')}</span>
        </Link>
        <Link to="/deck" className="card hub-item">
          <span aria-hidden>🗂️</span>
          <span className="hub-item__label">{t('deckTitle')}</span>
        </Link>
      </div>
    </div>
  );
}
