// ============================================
// SRS — FSRS qua ts-fsrs (D4). KHÔNG dùng SM-2 reviewCard của extension.
// Thẻ SM-2 import (chỉ có interval/ease/reps) được map sang state FSRS
// ngay lần chấm đầu tiên (fromSm2) — không reset tiến độ.
// Quy tắc core (ARCHITECTURE §3.5): `now` luôn là tham số, fuzz tắt (deterministic).
// ============================================

import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FsrsCard,
  type Grade,
} from 'ts-fsrs';
import type { ReviewRating, VocabCard, VocabCardInput } from './types';

const f = fsrs(generatorParameters({ enable_fuzz: false }));

const RATING: Record<ReviewRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const DAY_MS = 86_400_000;

/** Thẻ mới: due ngay, tham số SM-2 mặc định giữ cho tương thích export (D8). */
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

/** Map ease SM-2 [1.3..2.8] → difficulty FSRS [~10..~3] (ease cao = từ dễ). */
function easeToDifficulty(ease: number): number {
  const d = 11 - ((ease - 1.3) * 8) / 1.5;
  return Math.min(10, Math.max(1, d));
}

/**
 * Thẻ SM-2 từ extension → thẻ mang state FSRS xấp xỉ:
 * stability ≈ interval (ngày), difficulty từ ease, lịch `due` giữ nguyên.
 */
export function fromSm2(card: VocabCard): VocabCard {
  if (card.reps === 0 && card.interval === 0) return card; // thẻ mới — createEmptyCard lo
  return {
    ...card,
    stability: Math.max(0.1, card.interval),
    difficulty: easeToDifficulty(card.ease),
    fsrsState: State.Review,
    lastReview: card.lastReview ?? card.due - card.interval * DAY_MS,
    learningSteps: 0,
  };
}

/** VocabCard → ts-fsrs Card. */
function toFsrs(card: VocabCard): FsrsCard {
  const hasFsrs = card.fsrsState != null || (card.stability ?? 0) > 0;
  const c = hasFsrs ? card : fromSm2(card);
  if (c.fsrsState == null && (c.stability ?? 0) === 0) {
    return createEmptyCard(new Date(c.due));
  }
  return {
    due: new Date(c.due),
    stability: c.stability ?? 0.1,
    difficulty: c.difficulty ?? 5,
    elapsed_days: 0,
    scheduled_days: c.interval,
    reps: c.reps,
    lapses: c.lapses,
    learning_steps: c.learningSteps ?? 0,
    state: (c.fsrsState ?? State.Review) as State,
    last_review: c.lastReview != null ? new Date(c.lastReview) : undefined,
  };
}

/** Chấm một thẻ → thẻ mới với lịch FSRS. Field SM-2 cũ (ease) giữ nguyên để export ngược. */
export function schedule(card: VocabCard, rating: ReviewRating, now: number): VocabCard {
  const rec = f.next(toFsrs(card), new Date(now), RATING[rating]);
  return {
    ...card,
    due: rec.card.due.getTime(),
    interval: rec.card.scheduled_days,
    stability: rec.card.stability,
    difficulty: rec.card.difficulty,
    reps: rec.card.reps,
    lapses: rec.card.lapses,
    fsrsState: rec.card.state,
    learningSteps: rec.card.learning_steps,
    lastReview: now,
    updatedAt: now,
  };
}

/** Khoảng chờ (ms) nếu chấm từng mức — hiện trên 4 nút rating ("10p / 1ng / 3ng…"). */
export function previewGaps(card: VocabCard, now: number): Record<ReviewRating, number> {
  const preview = f.repeat(toFsrs(card), new Date(now));
  const gap = (r: Rating) => preview[r as 1 | 2 | 3 | 4].card.due.getTime() - now;
  return {
    again: gap(Rating.Again),
    hard: gap(Rating.Hard),
    good: gap(Rating.Good),
    easy: gap(Rating.Easy),
  };
}

/** Thẻ đã đến hạn, cũ nhất trước; `limit` cắt phiên. */
export function getDueCards(deck: VocabCard[], now: number, limit?: number): VocabCard[] {
  const due = deck.filter((c) => c.due <= now).sort((a, b) => a.due - b.due);
  return limit ? due.slice(0, limit) : due;
}
