import { Link } from 'react-router-dom';
import { useI18n, type MsgKey } from '../../i18n';

const MODES: { to: string; icon: string; label: MsgKey; phase?: string }[] = [
  { to: '/review', icon: '📇', label: 'studyReview' },
  { to: '/quiz', icon: '🎯', label: 'studyQuizCloze' },
  { to: '/deck', icon: '🗂️', label: 'studyDeck' },
  { to: '/mistakes', icon: '📓', label: 'studyMistakes' },
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
            {m.phase && <span className="badge-soon">{m.phase}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
