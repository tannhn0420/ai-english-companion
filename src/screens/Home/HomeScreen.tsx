import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { countCards, countDue } from '../../services/db';
import { useI18n } from '../../i18n';

/**
 * Home kiểu widget (DESIGN.md §4.1) — do đọc/đếm trực tiếp từ IndexedDB.
 * Streak/level nối vào ở Phase 3. Signature .hl chỉ dùng ở hero (D14).
 */
export default function HomeScreen() {
  const { t } = useI18n();
  const [total, setTotal] = useState<number | null>(null);
  const [due, setDue] = useState(0);

  useEffect(() => {
    let alive = true;
    void Promise.all([countCards(), countDue(Date.now())]).then(([c, d]) => {
      if (alive) {
        setTotal(c);
        setDue(d);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const empty = total === 0;

  return (
    <div>
      <div className="hub-item tabular" style={{ marginBottom: 16 }}>
        <span title="Streak — Phase 3">🔥 —</span>
        <span title="Level — Phase 3">⭐ Lv —</span>
        {total !== null && total > 0 && (
          <span className="text-2" style={{ marginLeft: 'auto', fontSize: 13 }}>
            {t('homeTotal', { n: total })}
          </span>
        )}
      </div>

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
