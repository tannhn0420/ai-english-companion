import { Link } from 'react-router-dom';

const MODES = [
  { to: '/review', icon: '📇', label: 'Ôn thẻ (SRS)', phase: 'Phase 2' },
  { to: '/quiz', icon: '🎯', label: 'Quiz & Cloze', phase: 'Phase 2' },
  { to: '/study', icon: '🗂️', label: 'Quản lý Deck', phase: 'Phase 1' },
  { to: '/study', icon: '📓', label: 'Ôn lỗi (sổ tay lỗi)', phase: 'Phase 9' },
];

export default function StudyHub() {
  return (
    <div>
      <h1 className="screen-title">Ôn tập</h1>
      <div className="hub-list">
        {MODES.map((m) => (
          <Link key={m.label} to={m.to} className="card hub-item">
            <span aria-hidden>{m.icon}</span>
            <span className="hub-item__label">{m.label}</span>
            <span className="badge-soon">{m.phase}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
