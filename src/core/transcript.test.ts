import { describe, expect, it } from 'vitest';
import { activeSentence, estimateSentenceStarts } from './transcript';

describe('estimateSentenceStarts', () => {
  it('cau dai chiem nhieu thoi gian hon; bat dau tu 0; trong pham vi duration', () => {
    const starts = estimateSentenceStarts(['Hi.', 'This one is much much longer than the first.'], 100);
    expect(starts[0]).toBe(0);
    expect(starts[1]).toBeGreaterThan(0);
    expect(starts[1]).toBeLessThan(100);
    // cau 1 ngan -> chiem it thoi gian -> cau 2 bat dau som
    expect(starts[1]).toBeLessThan(20);
  });

  it('mang rong -> mang rong', () => {
    expect(estimateSentenceStarts([], 100)).toEqual([]);
  });
});

describe('activeSentence', () => {
  const starts = [0, 10, 25, 40];
  it('tra ve cau dang phat theo thoi gian', () => {
    expect(activeSentence(starts, 0)).toBe(0);
    expect(activeSentence(starts, 12)).toBe(1);
    expect(activeSentence(starts, 24.9)).toBe(1);
    expect(activeSentence(starts, 25)).toBe(2);
    expect(activeSentence(starts, 999)).toBe(3);
  });
});
