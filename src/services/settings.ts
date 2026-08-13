// ============================================
// Settings — localStorage (đọc đồng bộ khi boot, D6).
// Theme (`aec-theme`) và ngôn ngữ UI (`aec-lang`) có key riêng vì cần trước render.
// ============================================

export interface AppSettings {
  ttsVoiceEn: string; // voiceURI ưu tiên; '' = tự chọn giọng tự nhiên nhất
  ttsVoiceVi: string;
  ttsRate: number;
  dailyGoal: number; // số thẻ mục tiêu/ngày
  reviewAutoSpeak: boolean; // tự đọc term khi hiện thẻ mới trong phiên ôn
  // AI (Phase 4) — key chỉ nằm localStorage, không bao giờ sync (R4/§12)
  aiProvider: 'gemini' | 'groq' | 'openrouter' | 'openai';
  aiKey: string;
  aiModel: string; // '' = model mặc định theo provider (tier cheap)
  aiModelGood: string; // '' = dùng aiModel (tier good)
  aiBaseUrl: string; // chỉ dùng cho provider 'openai' (endpoint tự host)
  practiceLevel: string; // beginner | intermediate | advanced (vocab test set mặc định)
}

const KEY = 'aec-settings';

const DEFAULTS: AppSettings = {
  ttsVoiceEn: '',
  ttsVoiceVi: '',
  ttsRate: 0.95,
  dailyGoal: 10,
  reviewAutoSpeak: true,
  aiProvider: 'gemini',
  aiKey: '',
  aiModel: '',
  aiModelGood: '',
  aiBaseUrl: '',
  practiceLevel: 'intermediate',
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
