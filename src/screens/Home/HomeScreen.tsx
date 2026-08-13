import { Link } from 'react-router-dom';

/**
 * Home kiểu widget (DESIGN.md §4.1). Phase 0: layout tĩnh;
 * số liệu thật (due count, streak) nối vào ở Phase 2–3.
 */
export default function HomeScreen() {
  return (
    <div>
      <div className="hub-item" style={{ marginBottom: 16 }}>
        <span title="Streak — hoạt động từ Phase 3">🔥 —</span>
        <span title="Level — hoạt động từ Phase 3">⭐ Lv —</span>
      </div>

      <div className="card" style={{ textAlign: 'center', marginBottom: 16 }}>
        <p className="text-2" style={{ marginTop: 0 }}>
          Deck của bạn đang trống.
          <br />
          Import từ extension hoặc thêm thẻ đầu tiên ở Phase 1.
        </p>
        <Link to="/review" className="btn-primary">
          ▶ Ôn ngay
        </Link>
      </div>

      <div className="hub-list" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Link to="/quiz" className="card hub-item">
          <span aria-hidden>🎯</span>
          <span className="hub-item__label">Quiz</span>
        </Link>
        <Link to="/practice" className="card hub-item">
          <span aria-hidden>🎙️</span>
          <span className="hub-item__label">Luyện tập</span>
        </Link>
      </div>
    </div>
  );
}
