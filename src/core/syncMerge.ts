// ============================================
// Merge logic cho sync (Phase 8) — thuần, test được.
// - Thẻ: last-write-wins theo updatedAt (fallback createdAt).
// - Dữ liệu học (practiceDays/weakWords): merge MAX-WISE từng entry —
//   idempotent, không double-count khi hai máy đẩy qua lại nhiều vòng.
// - practiceStats: DẪN XUẤT lại từ days sau merge (không merge trực tiếp).
// ============================================

import type { PerDay, PracticeStats } from './gamification';
import type { VocabCard } from './types';

export function cardStamp(c: VocabCard): number {
  return c.updatedAt ?? c.createdAt;
}

export interface RemoteCard {
  id: string;
  payload: VocabCard;
  updated_at: number;
  deleted: boolean;
}

export type CardAction =
  | { kind: 'keep-local' }
  | { kind: 'apply-remote'; card: VocabCard }
  | { kind: 'delete-local' };

/** Quyết định phía nhận khi pull một dòng remote về (LWW). */
export function resolveRemote(local: VocabCard | undefined, remote: RemoteCard): CardAction {
  if (remote.deleted) {
    if (!local) return { kind: 'keep-local' };
    return cardStamp(local) <= remote.updated_at ? { kind: 'delete-local' } : { kind: 'keep-local' };
  }
  if (!local || cardStamp(local) < remote.updated_at) {
    return { kind: 'apply-remote', card: remote.payload };
  }
  return { kind: 'keep-local' };
}

export function mergeDays(a: PerDay, b: PerDay): PerDay {
  const out: PerDay = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    out[k] = cur
      ? { attempts: Math.max(cur.attempts, v.attempts), sumScore: Math.max(cur.sumScore, v.sumScore) }
      : v;
  }
  return out;
}

export function statsFromDays(days: PerDay): PracticeStats {
  let attempts = 0;
  let sumScore = 0;
  for (const v of Object.values(days)) {
    attempts += v.attempts;
    sumScore += v.sumScore;
  }
  return { attempts, sumScore };
}

export interface WeakEntryLike {
  misses: number;
  attempts: number;
}

export function mergeWeak(
  a: Record<string, WeakEntryLike>,
  b: Record<string, WeakEntryLike>,
): Record<string, WeakEntryLike> {
  const out: Record<string, WeakEntryLike> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    out[k] = cur
      ? { misses: Math.max(cur.misses, v.misses), attempts: Math.max(cur.attempts, v.attempts) }
      : v;
  }
  return out;
}

/** streakFreeze: lấy ngày dùng gần nhất (chuỗi 'YYYY-MM-DD' so sánh được). */
export function mergeFreeze(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}
