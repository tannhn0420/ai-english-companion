// ============================================
// Cloze — đục lỗ từ CÂU THẬT, ưu tiên (PHASES Phase 2):
//   1) `context` cá nhân của thẻ (câu bạn đã gặp khi lưu từ)
//   2) câu Tatoeba trong bundle chứa từ đó (kèm dịch VI + id để attribution R8)
//   3) `example` của thẻ
// Không có nguồn nào → null (thẻ đó không có cloze).
// ============================================

import type { VocabCard } from './types';

export interface SentencePair {
  id: number;
  en: string;
  vi: string;
}

export type ClozeSource = 'context' | 'tatoeba' | 'example';

export interface ClozeQ {
  cardId: string;
  term: string;
  before: string;
  blank: string; // từ đúng như xuất hiện trong câu (giữ hoa/thường, biến thể)
  after: string;
  vi?: string;
  source: ClozeSource;
  tatoebaId?: number;
}

export interface SentenceDeps {
  pairs: SentencePair[];
  /** headword (lowercase) → index các câu chứa nó */
  index: Map<string, number[]>;
  /** biến thể (lowercase) → headword */
  variants: Record<string, string>;
}

/** Xây index headword → câu, dùng một lần lúc load bundle. */
export function buildSentenceIndex(
  pairs: SentencePair[],
  variants: Record<string, string>,
  words: Record<string, number>,
): Map<string, number[]> {
  const index = new Map<string, number[]>();
  pairs.forEach((p, i) => {
    const tokens = p.en.toLowerCase().replace(/[^a-z' -]/g, '').split(/[\s-]+/);
    const heads = new Set<string>();
    for (const tok of tokens) {
      const clean = tok.replace(/^'+|'+$/g, '');
      if (!clean) continue;
      const head = words[clean] ? clean : variants[clean];
      if (head) heads.add(head);
    }
    for (const h of heads) {
      const list = index.get(h);
      if (list) list.push(i);
      else index.set(h, [i]);
    }
  });
  return index;
}

/** Tìm term (hoặc biến thể của nó) trong câu; trả vị trí + từ khớp nguyên bản. */
function findInSentence(
  sentence: string,
  term: string,
  variants: Record<string, string>,
): { start: number; word: string } | null {
  const t = term.trim().toLowerCase();
  if (!t) return null;

  // Cụm nhiều từ: match chuỗi con (không phân biệt hoa thường)
  if (t.includes(' ')) {
    const i = sentence.toLowerCase().indexOf(t);
    return i >= 0 ? { start: i, word: sentence.slice(i, i + t.length) } : null;
  }

  // Một từ: match theo word-boundary, chấp nhận cả biến thể (walks/walked…)
  const forms = new Set([t]);
  for (const [v, head] of Object.entries(variants)) if (head === t) forms.add(v);
  const re = /[a-zA-Z']+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence))) {
    if (forms.has(m[0].toLowerCase())) return { start: m.index, word: m[0] };
  }
  return null;
}

function toCloze(
  card: VocabCard,
  text: string,
  source: ClozeSource,
  variants: Record<string, string>,
  vi?: string,
  tatoebaId?: number,
): ClozeQ | null {
  const hit = findInSentence(text, card.term, variants);
  if (!hit) return null;
  return {
    cardId: card.id,
    term: card.term,
    before: text.slice(0, hit.start),
    blank: hit.word,
    after: text.slice(hit.start + hit.word.length),
    vi,
    source,
    tatoebaId,
  };
}

/** Sinh cloze cho một thẻ theo thứ tự ưu tiên nguồn câu. */
export function buildCloze(card: VocabCard, deps?: SentenceDeps): ClozeQ | null {
  const variants = deps?.variants ?? {};

  if (card.context) {
    const q = toCloze(card, card.context, 'context', variants);
    if (q) return q;
  }

  if (deps) {
    const head =
      deps.variants[card.term.trim().toLowerCase()] ?? card.term.trim().toLowerCase();
    const hits = deps.index.get(head);
    if (hits) {
      // Câu ngắn trước — cloze dễ đọc trên mobile
      const sorted = [...hits].sort((a, b) => deps.pairs[a].en.length - deps.pairs[b].en.length);
      for (const i of sorted) {
        const p = deps.pairs[i];
        const q = toCloze(card, p.en, 'tatoeba', variants, p.vi, p.id);
        if (q) return q;
      }
    }
  }

  if (card.example) {
    const q = toCloze(card, card.example, 'example', variants);
    if (q) return q;
  }

  return null;
}
