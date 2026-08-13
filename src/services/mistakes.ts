// ============================================
// Service sổ tay lỗi (D12): dedupe khi ghi (cùng span + câu → gộp), và
// hàng đợi ôn lỗi SRS-lite (đúng → giãn, sai → gặp lại sớm). Tách khỏi
// lịch FSRS của deck.
// ============================================

import type { Mistake } from '../core/types';
import { addMistakes, getAllMistakes, deleteMistake, putMistake } from './db';
import { queueSync } from './sync';

const DAY_MS = 86_400_000;

/** Ghi các lỗi mới, bỏ trùng (cùng errorSpan + corrected đã có thì thôi). */
export async function recordMistakes(list: Mistake[]): Promise<void> {
  if (list.length === 0) return;
  const existing = await getAllMistakes();
  const seen = new Set(existing.map((m) => `${m.errorSpan}|${m.corrected}`.toLowerCase()));
  const fresh = list.filter((m) => {
    const k = `${m.errorSpan}|${m.corrected}`.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  await addMistakes(fresh);
  if (fresh.length) queueSync();
}

/** Lỗi đến hạn ôn (SRS-lite riêng). */
export async function getDueMistakes(now: number): Promise<Mistake[]> {
  const all = await getAllMistakes();
  return all.filter((m) => (m.due ?? 0) <= now).sort((a, b) => (a.due ?? 0) - (b.due ?? 0));
}

/** Chấm một lần ôn lỗi: đúng → giãn theo reps (1,3,7… ngày); sai → mai gặp lại. */
export async function reviewMistake(m: Mistake, correct: boolean, now: number): Promise<void> {
  if (correct) {
    const reps = (m.reps ?? 0) + 1;
    const days = reps >= 3 ? 7 : reps === 2 ? 3 : 1;
    await putMistake({ ...m, reps, due: now + days * DAY_MS });
  } else {
    await putMistake({ ...m, reps: 0, due: now + DAY_MS });
  }
  queueSync();
}

export { deleteMistake, getAllMistakes };
