// ============================================
// Từ hay sai — meta key `weakWords`, GIỮ SHAPE của extension:
// Record<term, { misses, attempts }> (ProgressApp đọc đúng shape này).
// Quiz/cloze ghi từ Phase 2; dictation/speaking đổ thêm ở Phase 6-7.
// ============================================

import { getMeta, setMeta } from './db';

export interface WeakEntry {
  misses: number;
  attempts: number;
}

export type WeakWordMap = Record<string, WeakEntry>;

/** Ghi một lượt gặp từ: attempts luôn tăng, misses tăng khi sai. */
export async function bumpWeakWord(term: string, wrong: boolean): Promise<void> {
  const key = term.trim().toLowerCase();
  if (!key) return;
  const map = await getMeta<WeakWordMap>('weakWords', {});
  const cur = map[key] ?? { misses: 0, attempts: 0 };
  map[key] = { misses: cur.misses + (wrong ? 1 : 0), attempts: cur.attempts + 1 };
  await setMeta('weakWords', map);
}

export function getWeakWords(): Promise<WeakWordMap> {
  return getMeta<WeakWordMap>('weakWords', {});
}
