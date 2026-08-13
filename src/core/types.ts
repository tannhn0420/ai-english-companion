// ============================================
// Types — port từ ai-translator-ext src/types/index.ts.
// RÀNG BUỘC CỨNG (D8): VocabCard tương thích import/export 100% với extension;
// field mới chỉ được thêm dạng optional.
// ============================================

export type Language = 'en' | 'vi';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface VocabCard {
  id: string;
  term: string;
  lang: Language; // ngôn ngữ của term
  meaning: string;
  ipa?: string;
  example?: string;
  context?: string; // câu gốc nơi gặp từ (extension lưu khi save từ trang web)
  sourceUrl?: string;
  topic?: string;
  image?: string; // ảnh minh họa đã downscale (data URL)
  createdAt: number;
  // SRS (SM-2 shape của extension — giữ nguyên để export ngược)
  due: number; // timestamp ms
  interval: number; // ngày
  ease: number;
  reps: number;
  lapses: number;
  // Chỉ web app (optional — không phá tương thích):
  updatedAt?: number; // sync last-write-wins ở Phase 8
  stability?: number; // FSRS state
  difficulty?: number; // FSRS state
  fsrsState?: number; // ts-fsrs State enum (0 New, 1 Learning, 2 Review, 3 Relearning)
  lastReview?: number; // timestamp lần ôn gần nhất
  learningSteps?: number; // vị trí trong learning steps của ts-fsrs
}

/** Input tạo thẻ mới (field SRS do core/srs điền). */
export type VocabCardInput = Pick<VocabCard, 'term' | 'lang' | 'meaning'> &
  Partial<Pick<VocabCard, 'ipa' | 'example' | 'context' | 'sourceUrl' | 'topic' | 'image'>>;

// ============================================
// Sổ tay lỗi trung tâm (D12) — dùng từ Phase 6, UI ôn lỗi Phase 9
// ============================================

export type MistakeSource = 'dictation' | 'speaking' | 'writing' | 'quiz' | 'conversation';
export type MistakeType =
  | 'grammar'
  | 'spelling'
  | 'word-choice'
  | 'preposition'
  | 'tense'
  | 'listening';

export interface Mistake {
  id: string;
  source: MistakeSource;
  original: string;
  corrected: string;
  errorSpan?: string;
  type?: MistakeType;
  note?: string; // giải thích ngắn tiếng Việt
  createdAt: number;
  // Ôn lỗi (SRS-lite riêng, không trộn lịch FSRS của deck)
  due?: number;
  reps?: number;
}

// ============================================
// Practice pack (Phase 4+) — port nguyên từ extension
// ============================================

export interface PracticeVocab {
  term: string;
  ipa?: string;
  meaning: string;
  example?: string;
}

export interface PracticePhrase {
  en: string;
  vi: string;
}

export interface DialogueLine {
  speaker: string;
  en: string;
  vi: string;
}

export interface PracticePack {
  topic: string;
  vocab: PracticeVocab[];
  phrases: PracticePhrase[];
  dialogue: DialogueLine[];
  passage: PracticePhrase[]; // độc thoại ngắn, mỗi item một câu
}
