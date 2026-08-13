import { useI18n, type MsgKey } from '../../i18n';

const MODES: { icon: string; label: MsgKey; phase: string }[] = [
  { icon: '🎙️', label: 'practiceTopic', phase: 'Phase 4' },
  { icon: '🎧', label: 'practiceListen', phase: 'Phase 5' },
  { icon: '✍️', label: 'practiceDictation', phase: 'Phase 6' },
  { icon: '🗣️', label: 'practiceSpeaking', phase: 'Phase 7' },
  { icon: '📔', label: 'practiceJournal', phase: 'Phase 9' },
  { icon: '🎭', label: 'practiceMissions', phase: 'Phase 10' },
];

export default function PracticeHub() {
  const { t } = useI18n();
  return (
    <div>
      <h1 className="screen-title">{t('practiceTitle')}</h1>
      <div className="hub-list">
        {MODES.map((m) => (
          <div key={m.label} className="card hub-item" aria-disabled>
            <span aria-hidden>{m.icon}</span>
            <span className="hub-item__label">{t(m.label)}</span>
            <span className="badge-soon">{m.phase}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
