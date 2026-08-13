// ============================================
// Settings — localStorage (đọc đồng bộ khi boot, D6).
// Theme (`aec-theme`) và ngôn ngữ UI (`aec-lang`) có key riêng vì cần trước render.
// ============================================

export interface AppSettings {
  ttsVoiceEn: string; // voiceURI ưu tiên; '' = tự chọn giọng tự nhiên nhất
  ttsVoiceVi: string;
  ttsRate: number;
  dailyGoal: number; // số thẻ mục tiêu/ngày (dùng từ Phase 3)
}

const KEY = 'aec-settings';

const DEFAULTS: AppSettings = {
  ttsVoiceEn: '',
  ttsVoiceVi: '',
  ttsRate: 0.95,
  dailyGoal: 10,
};

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode — settings chỉ sống trong phiên */
  }
  return next;
}
