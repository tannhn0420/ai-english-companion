import { describe, expect, it } from 'vitest';
import { dayDiff, dayKey } from './dayKey';

describe('dayKey', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    // 2026-08-13 12:00 local
    const ts = new Date(2026, 7, 13, 12, 0, 0).getTime();
    expect(dayKey(ts)).toBe('2026-08-13');
  });

  it('pads month and day', () => {
    const ts = new Date(2026, 0, 5, 8, 0, 0).getTime();
    expect(dayKey(ts)).toBe('2026-01-05');
  });
});

describe('dayDiff', () => {
  it('returns 1 for consecutive days (streak continues)', () => {
    expect(dayDiff('2026-08-12', '2026-08-13')).toBe(1);
  });

  it('crosses month and year boundaries', () => {
    expect(dayDiff('2025-12-31', '2026-01-01')).toBe(1);
    expect(dayDiff('2026-08-01', '2026-08-31')).toBe(30);
  });

  it('returns 0 for the same day and negatives for reversed order', () => {
    expect(dayDiff('2026-08-13', '2026-08-13')).toBe(0);
    expect(dayDiff('2026-08-13', '2026-08-12')).toBe(-1);
  });
});
