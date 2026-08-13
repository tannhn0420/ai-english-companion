// ============================================
// Quiz MCQ — sinh từ deck, 0 token (D5). Port ý tưởng từ FlashcardsApp
// của extension, tách thuần để test được. `rng` là tham số (deterministic).
// ============================================

import type { VocabCard } from './types';

export type QuizDir = 'term2meaning' | 'meaning2term';

export interface QuizQ {
  cardId: string;
  term: string;
  dir: QuizDir;
  prompt: string;
  options: string[]; // 4 lựa chọn (hoặc ít hơn nếu deck nhỏ)
  answer: number; // index đáp án đúng
}

export interface QuizOpts {
  size?: number;
  topic?: string;
  rng?: () => number;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sinh câu hỏi MCQ. Cần tối thiểu 4 thẻ có meaning; ít hơn → []. */
export function buildQuiz(deck: VocabCard[], opts: QuizOpts = {}): QuizQ[] {
  const { size = 10, topic, rng = Math.random } = opts;
  const pool = deck.filter(
    (c) => c.meaning.trim() && (!topic || (c.topic || '') === topic),
  );
  if (pool.length < 4) return [];

  const picked = shuffle(pool, rng).slice(0, size);
  return picked.map((card) => {
    const dir: QuizDir = rng() < 0.5 ? 'term2meaning' : 'meaning2term';
    const correct = dir === 'term2meaning' ? card.meaning : card.term;
    const distractorPool = shuffle(
      pool.filter((c) => c.id !== card.id),
      rng,
    );
    const seen = new Set([correct.trim().toLowerCase()]);
    const distractors: string[] = [];
    for (const c of distractorPool) {
      const v = dir === 'term2meaning' ? c.meaning : c.term;
      const key = v.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      distractors.push(v);
      if (distractors.length === 3) break;
    }
    const options = shuffle([correct, ...distractors], rng);
    return {
      cardId: card.id,
      term: card.term,
      dir,
      prompt: dir === 'term2meaning' ? card.term : card.meaning,
      options,
      answer: options.indexOf(correct),
    };
  });
}
