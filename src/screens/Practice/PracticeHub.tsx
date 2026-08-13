const MODES = [
  { icon: '🎙️', label: 'Practice theo chủ đề', phase: 'Phase 4' },
  { icon: '🎧', label: 'Nghe (VOA / packs)', phase: 'Phase 5' },
  { icon: '✍️', label: 'Nghe chép chính tả', phase: 'Phase 6' },
  { icon: '🗣️', label: 'Luyện nói', phase: 'Phase 7' },
  { icon: '📔', label: 'Nhật ký + AI sửa', phase: 'Phase 9' },
  { icon: '🎭', label: 'Hội thoại nhiệm vụ', phase: 'Phase 10' },
];

export default function PracticeHub() {
  return (
    <div>
      <h1 className="screen-title">Luyện</h1>
      <div className="hub-list">
        {MODES.map((m) => (
          <div key={m.label} className="card hub-item" aria-disabled>
            <span aria-hidden>{m.icon}</span>
            <span className="hub-item__label">{m.label}</span>
            <span className="badge-soon">{m.phase}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
