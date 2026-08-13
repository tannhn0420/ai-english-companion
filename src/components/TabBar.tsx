import { NavLink } from 'react-router-dom';
import { useI18n, type MsgKey } from '../i18n';

const TABS: { to: string; icon: string; label: MsgKey }[] = [
  { to: '/', icon: '🏠', label: 'tabHome' },
  { to: '/study', icon: '📇', label: 'tabStudy' },
  { to: '/practice', icon: '🎯', label: 'tabPractice' },
  { to: '/settings', icon: '⚙️', label: 'tabSettings' },
];

export default function TabBar() {
  const { t } = useI18n();
  return (
    <nav className="tabbar" aria-label={t('tabHome')}>
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => `tabbar__item${isActive ? ' active' : ''}`}
        >
          <span className="tabbar__icon" aria-hidden>
            {tab.icon}
          </span>
          <span>{t(tab.label)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
