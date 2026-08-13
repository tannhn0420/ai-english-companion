// ============================================
// Gamification — cùng mô hình DẪN XUẤT với ProgressApp của extension:
// XP/level/streak/badges tính từ dữ liệu hoạt động, không lưu số riêng
// (idempotent, không double-count, sync-friendly). Key/shape meta giữ
// nguyên như extension: `practiceStats`, `practiceDays` (D12, §3.2).
// Mới so với extension: streak freeze (1 lần/7 ngày, cần lưu ngày dùng).
// Thuần — `todayKey`/`now` là tham số (§3.5).
// ============================================

export interface DayEntry {
  attempts: number;
  sumScore: number;
}

/** 'YYYY-MM-DD' → hoạt động ngày đó. Shape = `practiceDays` của extension. */
export type PerDay = Record<string, DayEntry>;

/** Shape = `practiceStats` của extension (cộng dồn trọn đời). */
export interface PracticeStats {
  attempts: number;
  sumScore: number;
}

export interface SessionResult {
  total: number; // số lượt (thẻ ôn / câu quiz)
  correct: number; // lượt đúng (review: không-phải-Quên)
}

// ---- XP / Level (hệ số + 500 XP/cấp giống extension) ----

export const XP_PER_LEVEL = 500;
export const XP_PER_WORD = 5;
export const XP_PER_ATTEMPT = 3;

export function xpOf(words: number, attempts: number): number {
  return words * XP_PER_WORD + attempts * XP_PER_ATTEMPT;
}

export function levelOf(xp: number): { level: number; inLevel: number; perLevel: number } {
  return { level: Math.floor(xp / XP_PER_LEVEL) + 1, inLevel: xp % XP_PER_LEVEL, perLevel: XP_PER_LEVEL };
}

// ---- Ghi nhận phiên ----

/** Cộng phiên vào ngày + tổng. Trả bản mới (không mutate). */
export function applySession(
  days: PerDay,
  stats: PracticeStats,
  result: SessionResult,
  todayKey: string,
): { days: PerDay; stats: PracticeStats; earnedXp: number } {
  const day = days[todayKey] ?? { attempts: 0, sumScore: 0 };
  return {
    days: {
      ...days,
      [todayKey]: { attempts: day.attempts + result.total, sumScore: day.sumScore + result.correct },
    },
    stats: { attempts: stats.attempts + result.total, sumScore: stats.sumScore + result.correct },
    earnedXp: result.total * XP_PER_ATTEMPT,
  };
}

// ---- Streak (+ freeze 1 lần/7 ngày) ----

const DAY_MS = 86_400_000;

function keyOf(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function msOf(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getTime(); // giữa trưa local — né DST
}

export interface StreakResult {
  streak: number;
  /** Ngày trống được freeze cứu trong lần tính này (cần persist nếu khác trước). */
  freezeUsedOn?: string;
}

/**
 * Streak = số ngày liên tiếp có hoạt động, tính lùi từ hôm nay (hôm nay trống
 * vẫn cho phép — giống extension). Cho phép "vá" đúng MỘT ngày trống nếu freeze
 * còn hiệu lực (chưa dùng trong 7 ngày gần nhất).
 */
export function computeStreak(
  days: PerDay,
  todayKey: string,
  freezeLastUsed?: string,
): StreakResult {
  const today = msOf(todayKey);
  const active = (k: string) => (days[k]?.attempts ?? 0) > 0;
  const freezeAvailable = (onKey: string) =>
    !freezeLastUsed || (msOf(onKey) - msOf(freezeLastUsed)) / DAY_MS >= 7;

  let streak = 0;
  let freezeUsedOn: string | undefined = freezeLastUsed;
  let usedThisRun: string | undefined;

  for (let i = 0; ; i++) {
    const k = keyOf(today - i * DAY_MS);
    if (active(k)) {
      streak++;
      continue;
    }
    if (i === 0) continue; // hôm nay chưa học — streak vẫn tính từ hôm qua
    // Ngày trống đã từng được freeze cứu → vẫn tính liền mạch
    if (freezeUsedOn === k) continue;
    // Thử dùng freeze cho đúng một ngày trống, với điều kiện ngày trước đó có hoạt động
    if (!usedThisRun && freezeAvailable(k) && active(keyOf(today - (i + 1) * DAY_MS))) {
      usedThisRun = k;
      freezeUsedOn = k;
      continue;
    }
    break;
  }

  return { streak, freezeUsedOn: usedThisRun };
}

// ---- Badges (dẫn xuất, giống extension — thêm vài mốc mới) ----

export interface BadgeInput {
  words: number;
  learned: number;
  attempts: number;
  streak: number;
}

export interface BadgeDef {
  id: string;
  icon: string;
  ok: (d: BadgeInput) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: 'start', icon: '🌱', ok: (d) => d.words >= 1 || d.attempts >= 1 },
  { id: 'words10', icon: '📚', ok: (d) => d.words >= 10 },
  { id: 'words50', icon: '🎓', ok: (d) => d.words >= 50 },
  { id: 'words100', icon: '🏛️', ok: (d) => d.words >= 100 },
  { id: 'learned50', icon: '🧠', ok: (d) => d.learned >= 50 },
  { id: 'streak3', icon: '🔥', ok: (d) => d.streak >= 3 },
  { id: 'streak7', icon: '⚡', ok: (d) => d.streak >= 7 },
  { id: 'streak30', icon: '🏆', ok: (d) => d.streak >= 30 },
  { id: 'attempts100', icon: '💪', ok: (d) => d.attempts >= 100 },
  { id: 'attempts500', icon: '🚀', ok: (d) => d.attempts >= 500 },
];

/** Badge vừa đạt được khi so trước/sau một phiên (để toast chúc mừng). */
export function newBadges(before: BadgeInput, after: BadgeInput): BadgeDef[] {
  return BADGES.filter((b) => !b.ok(before) && b.ok(after));
}
