import { Link } from 'react-router-dom';

export default function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="card" style={{ textAlign: 'center', marginTop: 48 }}>
      <h2>{title}</h2>
      {phase ? (
        <p className="text-2">Tính năng này sẽ có ở {phase} — xem docs/PHASES.md.</p>
      ) : (
        <p className="text-2">Đường dẫn không tồn tại.</p>
      )}
      <Link to="/">← Về Home</Link>
    </div>
  );
}
