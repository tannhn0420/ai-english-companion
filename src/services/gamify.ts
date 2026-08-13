// ============================================
// Gamify service — đọc/ghi meta (key/shape như extension: practiceStats,
// practiceDays; mới: streakFreeze) và áp một phiên học vào hệ thống.
// ============================================

import {
  applySession,
  computeStreak,
  newBadges,
  xpOf,
  type BadgeDef,
  type PerDay,
  type PracticeStats,
  type SessionResult,
} from '../core/gamification';
import { dayKey } from '../core/dayKey';
import { countCards, getMeta, setMeta } from './db';
import { queueSync } from './sync';

export interface SessionOutcome {
  earnedXp: number;
  streak: number;
  freezeUsed: boolean;
  badges: BadgeDef[]; // badge MỚI đạt trong phiên này
}

export interface GamifySnapshot {
  days: PerDay;
  stats: PracticeStats;
  freezeLastUsed?: string;
  streak: number;
  xp: number;
  words: number;
}

export async function loadGamify(now: number): Promise<GamifySnapshot> {
  const [days, stats, freeze, words] = await Promise.all([
    getMeta<PerDay>('practiceDays', {}),
    getMeta<PracticeStats>('practiceStats', { attempts: 0, sumScore: 0 }),
    getMeta<{ lastUsed?: string }>('streakFreeze', {}),
    countCards(),
  ]);
  const today = dayKey(now);
  const { streak } = computeStreak(days, today, freeze.lastUsed);
  return { days, stats, freezeLastUsed: freeze.lastUsed, streak, xp: xpOf(words, stats.attempts), words };
}

/** Gọi ĐÚNG MỘT LẦN khi kết thúc phiên Review/Quiz (từ event handler, không phải effect). */
export async function recordSession(result: SessionResult, now: number): Promise<SessionOutcome> {
  if (result.total <= 0) return { earnedXp: 0, streak: 0, freezeUsed: false, badges: [] };

  const before = await loadGamify(now);
  const today = dayKey(now);

  const applied = applySession(before.days, before.stats, result, today);
  const after = computeStreak(applied.days, today, before.freezeLastUsed);

  await setMeta('practiceDays', applied.days);
  await setMeta('practiceStats', applied.stats);
  if (after.freezeUsedOn) await setMeta('streakFreeze', { lastUsed: after.freezeUsedOn });

  const badges = newBadges(
    {
      words: before.words,
      learned: 0, // learned cần cả deck — badge learned50 chỉ xét ở Progress
      attempts: before.stats.attempts,
      streak: before.streak,
    },
    {
      words: before.words,
      learned: 0,
      attempts: applied.stats.attempts,
      streak: after.streak,
    },
  );

  queueSync(); // phiên học = thay đổi đáng đồng bộ (thẻ đã ghi trong lúc ôn + meta vừa ghi)

  return {
    earnedXp: applied.earnedXp,
    streak: after.streak,
    freezeUsed: Boolean(after.freezeUsedOn),
    badges,
  };
}
