import { describe, expect, it } from 'vitest';
import {
  applySession,
  computeStreak,
  levelOf,
  newBadges,
  xpOf,
  type PerDay,
} from './gamification';

const day = (attempts = 1) => ({ attempts, sumScore: attempts });

describe('xp / level', () => {
  it('cong thuc giong extension: words*5 + attempts*3, 500 XP/cap', () => {
    expect(xpOf(10, 20)).toBe(110);
    expect(levelOf(0)).toEqual({ level: 1, inLevel: 0, perLevel: 500 });
    expect(levelOf(1200)).toEqual({ level: 3, inLevel: 200, perLevel: 500 });
  });
});

describe('applySession', () => {
  it('cong don vao ngay + tong, khong mutate input', () => {
    const days: PerDay = { '2026-08-13': { attempts: 2, sumScore: 1 } };
    const stats = { attempts: 10, sumScore: 6 };
    const r = applySession(days, stats, { total: 5, correct: 4 }, '2026-08-13');
    expect(r.days['2026-08-13']).toEqual({ attempts: 7, sumScore: 5 });
    expect(r.stats).toEqual({ attempts: 15, sumScore: 10 });
    expect(r.earnedXp).toBe(15);
    expect(days['2026-08-13'].attempts).toBe(2); // input nguyen ven
  });

  it('ngay moi duoc tao', () => {
    const r = applySession({}, { attempts: 0, sumScore: 0 }, { total: 3, correct: 2 }, '2026-08-14');
    expect(r.days['2026-08-14']).toEqual({ attempts: 3, sumScore: 2 });
  });
});

describe('computeStreak', () => {
  it('lien tiep 3 ngay -> 3; hom nay chua hoc van tinh tu hom qua', () => {
    const days: PerDay = {
      '2026-08-11': day(),
      '2026-08-12': day(),
      '2026-08-13': day(),
    };
    expect(computeStreak(days, '2026-08-13').streak).toBe(3);
    // 14/08 chua hoc — streak van 3 (khong dut cho den het ngay)
    expect(computeStreak(days, '2026-08-14').streak).toBe(3);
  });

  it('ho 1 ngay + freeze kha dung -> va lai, bao ngay da dung', () => {
    const days: PerDay = {
      '2026-08-10': day(),
      '2026-08-11': day(),
      // 12/08 trong
      '2026-08-13': day(),
    };
    const r = computeStreak(days, '2026-08-13');
    expect(r.streak).toBe(3);
    expect(r.freezeUsedOn).toBe('2026-08-12');
  });

  it('freeze da dung trong 7 ngay -> khong va nua, streak dut', () => {
    const days: PerDay = {
      '2026-08-10': day(),
      '2026-08-11': day(),
      '2026-08-13': day(),
    };
    const r = computeStreak(days, '2026-08-13', '2026-08-09');
    expect(r.streak).toBe(1); // chi con 13/08
    expect(r.freezeUsedOn).toBeUndefined();
  });

  it('ngay da duoc freeze cuu truoc do van tinh lien mach (khong tieu them freeze)', () => {
    const days: PerDay = {
      '2026-08-10': day(),
      '2026-08-11': day(),
      '2026-08-13': day(),
      '2026-08-14': day(),
    };
    // freeze da dung dung ngay 12/08 (luu tu phien truoc).
    // Ngay duoc freeze BAO TOAN streak nhung khong +1 (giong Duolingo): 10,11,[12],13,14 -> 4
    const r = computeStreak(days, '2026-08-14', '2026-08-12');
    expect(r.streak).toBe(4);
    expect(r.freezeUsedOn).toBeUndefined(); // khong dung them lan nao
  });

  it('ho 2 ngay lien -> freeze chi va duoc 1, streak dut', () => {
    const days: PerDay = {
      '2026-08-09': day(),
      '2026-08-10': day(),
      // 11-12/08 trong
      '2026-08-13': day(),
    };
    expect(computeStreak(days, '2026-08-13').streak).toBe(1);
  });

  it('khong hoat dong nao -> 0', () => {
    expect(computeStreak({}, '2026-08-13').streak).toBe(0);
  });
});

describe('badges', () => {
  it('phat hien badge moi dat sau phien', () => {
    const before = { words: 9, learned: 0, attempts: 99, streak: 2 };
    const after = { words: 10, learned: 0, attempts: 104, streak: 3 };
    const ids = newBadges(before, after).map((b) => b.id);
    expect(ids).toContain('words10');
    expect(ids).toContain('attempts100');
    expect(ids).toContain('streak3');
    expect(ids).not.toContain('start'); // da co tu truoc
  });
});
