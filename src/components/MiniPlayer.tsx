import { useNavigate } from 'react-router-dom';
import { next, prev, stop, toggle, usePlayer } from '../services/audioPlayer';
import { useI18n } from '../i18n';

/** Thanh phát nhạc nổi trên TabBar — sống sót khi chuyển màn hình (nghe lúc chạy bộ). */
export default function MiniPlayer() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const p = usePlayer();
  const track = p.queue[p.index];
  if (!track) return null;

  const pct = p.duration > 0 ? (p.time / p.duration) * 100 : 0;

  return (
    <div className="miniplayer">
      <div className="miniplayer__bar">
        <i style={{ width: `${pct}%` }} />
      </div>
      <button onClick={prev} aria-label="⏮">
        ⏮
      </button>
      <button onClick={toggle} aria-label={p.playing ? '⏸' : '▶'} style={{ fontSize: 20 }}>
        {p.loading ? '…' : p.playing ? '⏸' : '▶'}
      </button>
      <button onClick={next} aria-label="⏭">
        ⏭
      </button>
      <button
        className="miniplayer__title"
        onClick={() => navigate('/listen')}
        title={t('listenTitle')}
      >
        <span>{track.title}</span>
        <small className="text-2 tabular">
          {p.queue.length > 1 ? `${p.index + 1}/${p.queue.length} · ` : ''}
          {fmt(p.time)}
          {p.duration > 0 ? ` / ${fmt(p.duration)}` : ''}
        </small>
      </button>
      <button onClick={stop} aria-label="✕">
        ✕
      </button>
    </div>
  );
}

function fmt(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return '0:00';
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, '0')}`;
}
