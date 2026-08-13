import { Link } from 'react-router-dom';
import { useI18n, type MsgKey } from '../i18n';

export default function ComingSoon({ titleKey, phase }: { titleKey: MsgKey; phase?: string }) {
  const { t } = useI18n();
  return (
    <div className="card" style={{ textAlign: 'center', marginTop: 48 }}>
      <h2>{t(titleKey)}</h2>
      <p className="text-2">{phase ? t('soonBody', { phase }) : t('notFoundBody')}</p>
      <Link to="/">{t('backHome')}</Link>
    </div>
  );
}
