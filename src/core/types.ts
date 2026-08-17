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

// ============================================
// Viết (Phase 9) — port từ extension writing assistant
// ============================================

export type WritingIssueType = 'grammar' | 'spelling' | 'word-choice' | 'style' | 'punctuation';

export interface WritingIssue {
  original: string; // đoạn sai copy nguyên từ bản gốc
  suggestion: string; // bản sửa
  why: string; // giải thích ngắn tiếng Việt
  type: WritingIssueType;
}

export interface ProofreadResult {
  corrected: string; // bản đã sửa đầy đủ
  issues: WritingIssue[];
  level?: string; // CEFR ước lượng của bản gốc (A1..C2)
}

// ============================================
// Hội thoại nhiệm vụ (Phase 10)
// ============================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface Scenario {
  id: string;
  emoji: string;
  title: string; // VI
  role: string; // vai AI đóng (EN, dùng trong prompt)
  you: string; // vai của bạn (VI)
  context: string; // bối cảnh (VI)
  goals: string[]; // mục tiêu cần hoàn thành (VI)
  opener: string; // câu mở đầu AI nói (EN)
}

export interface MissionResult {
  completed: boolean;
  score: number; // 0-100
  feedback: string; // VI
  better: string[]; // vài câu nói tốt hơn (EN)
  issues: WritingIssue[]; // lỗi để đổ vào sổ tay
}

// ============================================
// Nói (Phase 7) — port từ extension
// ============================================

export interface CriterionScore {
  band: number;
  comment: string;
}
export interface SpeakingAssessment {
  overall: number;
  criteria: {
    fluency: CriterionScore;
    lexical: CriterionScore;
    grammar: CriterionScore;
    pronunciation: CriterionScore;
  };
  strengths: string[];
  improvements: string[];
  better: string;
}

export interface MinimalPair {
  a: string;
  b: string;
  note?: string;
}
export interface DrillPack {
  sound: string;
  tip: string;
  pairs: MinimalPair[];
  sentences: PracticePhrase[];
}

/** Một bài nhật ký đã lưu (store `journal`). */
export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  prompt: string;
  text: string; // bản người dùng viết
  result?: ProofreadResult;
  createdAt: number;
  updatedAt?: number;
}
