import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/study', icon: '📇', label: 'Ôn tập' },
  { to: '/practice', icon: '🎯', label: 'Luyện' },
  { to: '/settings', icon: '⚙️', label: 'Cài đặt' },
];

export default function TabBar() {
  return (
    <nav className="tabbar" aria-label="Điều hướng chính">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) => `tabbar__item${isActive ? ' active' : ''}`}
        >
          <span className="tabbar__icon" aria-hidden>
            {t.icon}
          </span>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
