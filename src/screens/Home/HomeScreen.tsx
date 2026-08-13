import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';

/**
 * Home kiểu widget (DESIGN.md §4.1). Phase 0: layout tĩnh;
 * số liệu thật (due count, streak) nối vào ở Phase 2–3.
 * Signature .hl chỉ dùng ở hero này (D14 — kỷ luật 1-2 vết/màn hình).
 */
export default function HomeScreen() {
  const { t } = useI18n();
  return (
    <div>
      <div className="hub-item tabular" style={{ marginBottom: 16 }}>
        <span title="Streak — Phase 3">🔥 —</span>
        <span title="Level — Phase 3">⭐ Lv —</span>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="hero-line">
          <span className="hl">{t('homeDeckEmpty')}</span>
        </p>
        <p className="text-2" style={{ marginTop: 0 }}>
          {t('homeDeckEmptyHint')}
        </p>
        <Link to="/review" className="btn-primary">
          {t('homeReviewNow')}
        </Link>
      </div>

      <div className="hub-list" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Link to="/quiz" className="card hub-item">
          <span aria-hidden>🎯</span>
          <span className="hub-item__label">{t('homeQuiz')}</span>
        </Link>
        <Link to="/practice" className="card hub-item">
          <span aria-hidden>🎙️</span>
          <span className="hub-item__label">{t('homePractice')}</span>
        </Link>
      </div>
    </div>
  );
}
