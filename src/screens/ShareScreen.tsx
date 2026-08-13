import { Navigate, useSearchParams } from 'react-router-dom';

/**
 * Đích của Web Share Target (Android): share text từ app khác →
 * chuyển vào form thêm thẻ của Sổ từ (prefill qua sessionStorage).
 */
export default function ShareScreen() {
  const [params] = useSearchParams();
  const text = (params.get('text') || params.get('title') || params.get('url') || '').trim();
  if (text) {
    try {
      sessionStorage.setItem('aec-add-term', text.slice(0, 120));
    } catch {
      /* ignore */
    }
  }
  return <Navigate to="/deck" replace />;
}
