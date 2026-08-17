import { Link } from 'react-router-dom';
import { useI18n, type MsgKey } from '../../i18n';

const MODES: { icon: string; label: MsgKey; phase?: string; to?: string }[] = [
  { icon: '🎙️', label: 'practiceTopic', to: '/practice/topic' },
  { icon: '🧪', label: 'practiceVocabTest', to: '/vocabtest' },
  { icon: '🎧', label: 'practiceListen', to: '/listen' },
  { icon: '✍️', label: 'practiceDictation', to: '/dictation' },
  { icon: '🗣️', label: 'practiceSpeaking', phase: 'Phase 7' },
  { icon: '📔', label: 'practiceJournal', to: '/journal' },
  { icon: '🎭', label: 'practiceMissions', phase: 'Phase 10' },
];

export default function PracticeHub() {
  const { t } = useI18n();
  return (
    <div>
      <h1 className="screen-title">{t('practiceTitle')}</h1>
      <div className="hub-list">
        {MODES.map((m) =>
          m.to ? (
            <Link key={m.label} to={m.to} className="card hub-item">
              <span aria-hidden>{m.icon}</span>
              <span className="hub-item__label">{t(m.label)}</span>
            </Link>
          ) : (
            <div key={m.label} className="card hub-item" aria-disabled>
              <span aria-hidden>{m.icon}</span>
              <span className="hub-item__label">{t(m.label)}</span>
              <span className="badge-soon">{m.phase}</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
