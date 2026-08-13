import { Link } from 'react-router-dom';
import { useI18n, type MsgKey } from '../../i18n';

const MODES: { to: string; icon: string; label: MsgKey; phase: string }[] = [
  { to: '/review', icon: '📇', label: 'studyReview', phase: 'Phase 2' },
  { to: '/quiz', icon: '🎯', label: 'studyQuizCloze', phase: 'Phase 2' },
  { to: '/study', icon: '🗂️', label: 'studyDeck', phase: 'Phase 1' },
  { to: '/study', icon: '📓', label: 'studyMistakes', phase: 'Phase 9' },
];

export default function StudyHub() {
  const { t } = useI18n();
  return (
    <div>
      <h1 className="screen-title">{t('studyTitle')}</h1>
      <div className="hub-list">
        {MODES.map((m) => (
          <Link key={m.label} to={m.to} className="card hub-item">
            <span aria-hidden>{m.icon}</span>
            <span className="hub-item__label">{t(m.label)}</span>
            <span className="badge-soon">{m.phase}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
