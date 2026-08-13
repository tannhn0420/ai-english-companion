import { useState } from 'react';

type Theme = 'dark' | 'light';

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export default function SettingsScreen() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  function applyTheme(next: Theme) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('aec-theme', next);
    } catch {
      /* private mode — theme chỉ sống trong phiên này */
    }
  }

  return (
    <div>
      <h1 className="screen-title">Cài đặt</h1>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3>Giao diện</h3>
        <div className="hub-item">
          <span className="hub-item__label">Theme</span>
          <button
            className="badge-soon"
            onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? '🌙 Tối' : '☀️ Sáng'} — đổi
          </button>
        </div>
      </div>

      {(
        [
          ['Phát âm (giọng, tốc độ)', 'Phase 1'],
          ['AI (provider, API key)', 'Phase 4'],
          ['Học tập (mục tiêu ngày)', 'Phase 3'],
          ['Dữ liệu (import/export/backup)', 'Phase 1'],
          ['Nguồn dữ liệu & ghi công', 'Phase 1'],
        ] as const
      ).map(([label, phase]) => (
        <div key={label} className="card hub-item" style={{ marginBottom: 12 }} aria-disabled>
          <span className="hub-item__label">{label}</span>
          <span className="badge-soon">{phase}</span>
        </div>
      ))}
    </div>
  );
}
