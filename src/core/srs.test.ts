import { describe, expect, it } from 'vitest';
import { createCard, fromSm2, getDueCards, previewGaps, schedule } from './srs';
import type { VocabCard } from './types';

const NOW = 1_750_000_000_000;
const DAY = 86_400_000;

function newCard(): VocabCard {
  return createCard({ term: 'hello', meaning: 'xin chao', lang: 'en' }, NOW);
}

/** The SM-2 review-state tu extension (interval 6 ngay, ease 2.6, reps 3). */
function sm2Card(): VocabCard {
  return {
    ...newCard(),
    id: 'sm2-1',
    due: NOW + DAY, // con 1 ngay nua den han
    interval: 6,
    ease: 2.6,
    reps: 3,
    lapses: 1,
  };
}

describe('schedule (FSRS)', () => {
  it('the moi + Good: co stability/difficulty, reps=1, due tang', () => {
    const c = schedule(newCard(), 'good', NOW);
    expect(c.stability).toBeGreaterThan(0);
    expect(c.difficulty).toBeGreaterThan(0);
    expect(c.reps).toBe(1);
    expect(c.due).toBeGreaterThan(NOW);
    expect(c.lastReview).toBe(NOW);
    expect(c.fsrsState).toBeDefined();
  });

  it('deterministic: cung input cho cung output (fuzz off)', () => {
    expect(schedule(newCard(), 'good', NOW).due).toBe(schedule(newCard(), 'good', NOW).due);
  });

  it('4 muc rating cho khoang cho tang dan tren the review-state', () => {
    const gaps = previewGaps(sm2Card(), NOW);
    expect(gaps.again).toBeLessThan(gaps.hard);
    expect(gaps.hard).toBeLessThan(gaps.good);
    expect(gaps.good).toBeLessThan(gaps.easy);
  });

  it('Again tren the review-state: tang lapses, hen lai rat gan', () => {
    const c = schedule(sm2Card(), 'again', NOW);
    expect(c.lapses).toBe(2); // 1 (cu) + 1
    expect(c.due - NOW).toBeLessThan(DAY); // quay lai trong ngay (relearning)
  });

  it('field SM-2 (ease) giu nguyen de export nguoc ve extension', () => {
    const c = schedule(sm2Card(), 'good', NOW);
    expect(c.ease).toBe(2.6);
    expect(c.term).toBe('hello');
  });
});

describe('fromSm2 — migration the extension', () => {
  it('map interval->stability, ease->difficulty, giu nguyen due', () => {
    const m = fromSm2(sm2Card());
    expect(m.stability).toBe(6);
    expect(m.difficulty).toBeGreaterThan(1);
    expect(m.difficulty).toBeLessThan(10);
    expect(m.due).toBe(NOW + DAY);
    expect(m.lastReview).toBe(NOW + DAY - 6 * DAY);
  });

  it('the moi (reps=0, interval=0) khong bi dong dau FSRS som', () => {
    const m = fromSm2(newCard());
    expect(m.stability).toBeUndefined();
  });

  it('khong reset tien do: the SM-2 cham Good khong bi hen lai ve 0 ngay', () => {
    const c = schedule(sm2Card(), 'good', NOW);
    // Interval moi phai tiep noi tien do cu (>= 2 ngay), khong quay ve nhu the moi hoc
    expect(c.due - NOW).toBeGreaterThanOrEqual(2 * DAY);
  });
});

describe('getDueCards', () => {
  it('loc due <= now, sap xep cu truoc, limit cat phien', () => {
    const a = { ...newCard(), id: 'a', due: NOW - 2 * DAY };
    const b = { ...newCard(), id: 'b', due: NOW - DAY };
    const c = { ...newCard(), id: 'c', due: NOW + DAY };
    const due = getDueCards([b, c, a], NOW);
    expect(due.map((x) => x.id)).toEqual(['a', 'b']);
    expect(getDueCards([b, c, a], NOW, 1).map((x) => x.id)).toEqual(['a']);
  });
});
