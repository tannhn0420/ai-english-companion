// ============================================
// SRS — Phase 1 chỉ cần khởi tạo thẻ + chọn thẻ đến hạn.
// Scheduler thật là FSRS qua `ts-fsrs` ở Phase 2 (D4) — KHÔNG port SM-2 reviewCard.
// Quy tắc core (ARCHITECTURE §3.5): `now` luôn là tham số.
// ============================================

import type { VocabCard, VocabCardInput } from './types';

/** Thẻ mới: due ngay, tham số SRS mặc định — cùng giá trị với extension (createCard). */
export function createCard(input: VocabCardInput, now: number): VocabCard {
  return {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${now}-${Math.round(now % 1e6)}`,
    term: input.term.trim(),
    lang: input.lang,
    meaning: input.meaning.trim(),
    ipa: input.ipa,
    example: input.example,
    context: input.context,
    sourceUrl: input.sourceUrl,
    topic: input.topic,
    image: input.image,
    createdAt: now,
    due: now,
    interval: 0,
    ease: 2.5,
    reps: 0,
    lapses: 0,
    updatedAt: now,
  };
}

/** Thẻ đã đến hạn, cũ nhất trước; `limit` cắt phiên. */
export function getDueCards(deck: VocabCard[], now: number, limit?: number): VocabCard[] {
  const due = deck.filter((c) => c.due <= now).sort((a, b) => a.due - b.due);
  return limit ? due.slice(0, limit) : due;
}
