// ============================================
// Thống kê học tập nhẹ — meta store (tên key giữ shape để sync map 1-1, D12/§3.2).
// Gamification đầy đủ (XP/streak/badges) vào ở Phase 3.
// ============================================

import { getMeta, setMeta } from './db';

/** Từ hay sai (quiz/cloze; dictation/speaking sẽ đổ thêm vào ở Phase 6-7). */
export async function bumpWeakWord(term: string): Promise<void> {
  const key = term.trim().toLowerCase();
  if (!key) return;
  const map = await getMeta<Record<string, number>>('weakWords', {});
  map[key] = (map[key] || 0) + 1;
  await setMeta('weakWords', map);
}

export function getWeakWords(): Promise<Record<string, number>> {
  return getMeta<Record<string, number>>('weakWords', {});
}
