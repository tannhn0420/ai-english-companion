// ============================================
// Sổ tay lỗi trung tâm (D12) — thuần. Chuyển kết quả chấm của các kỹ năng
// thành `Mistake`, và biến một Mistake thành thẻ cloze để ôn lại đúng chỗ sai.
// UI ôn lỗi làm ở Phase 9; store + logic tạo lỗi có từ đây (Phase 6).
// ============================================

import type { WordDiff } from './dictation';
import type { ClozeQ } from './cloze';
import type { Mistake, WritingIssue, WritingIssueType } from './types';

function mkId(now: number, salt: string): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${now}-${salt}-${Math.round(now % 1e6)}`;
}

/**
 * Từ dictation: mỗi từ sai/thiếu → một Mistake, câu gốc làm ngữ cảnh.
 * Bỏ qua nếu từ sai quá ngắn (a/an/the… ít giá trị ôn).
 */
export function fromDictation(diff: WordDiff[], sentence: string, now: number): Mistake[] {
  const out: Mistake[] = [];
  for (const d of diff) {
    if (d.kind !== 'wrong' && d.kind !== 'missing') continue;
    const word = d.expected ?? '';
    if (word.replace(/[^\p{L}]/gu, '').length < 3) continue;
    out.push({
      id: mkId(now, word),
      source: 'dictation',
      original: d.got ? sentence.replace(d.got, `[${d.got}]`) : sentence,
      corrected: sentence,
      errorSpan: word,
      type: 'listening',
      createdAt: now,
      due: now,
      reps: 0,
    });
  }
  return out;
}

const WRITING_TYPE_MAP: Record<WritingIssueType, Mistake['type']> = {
  grammar: 'grammar',
  spelling: 'spelling',
  'word-choice': 'word-choice',
  style: 'word-choice',
  punctuation: 'grammar',
};

/**
 * Từ proofread bài viết: mỗi WritingIssue → một Mistake. `corrected` là câu
 * đúng (dùng suggestion làm span để ôn cloze), `original` giữ đoạn sai.
 */
export function fromProofread(issues: WritingIssue[], now: number): Mistake[] {
  const out: Mistake[] = [];
  for (const it of issues) {
    const suggestion = (it.suggestion || '').trim();
    const original = (it.original || '').trim();
    if (!suggestion || !original || suggestion.toLowerCase() === original.toLowerCase()) continue;
    out.push({
      id: mkId(now, suggestion),
      source: 'writing',
      original,
      corrected: suggestion,
      errorSpan: suggestion,
      type: WRITING_TYPE_MAP[it.type] ?? 'grammar',
      note: it.why,
      createdAt: now,
      due: now,
      reps: 0,
    });
  }
  return out;
}

/** Từ đọc sai khi luyện nói (STT không khớp) → Mistake source 'speaking'. */
export function fromSpeaking(diff: WordDiff[], sentence: string, now: number): Mistake[] {
  return fromDictation(diff, sentence, now).map((m) => ({
    ...m,
    source: 'speaking',
    type: 'word-choice',
  }));
}

/** Ôn lỗi = cloze đục đúng chỗ sai trong câu đúng. */
export function toClozeCard(m: Mistake): ClozeQ | null {
  const span = (m.errorSpan || '').trim();
  const text = m.corrected;
  if (!span) return null;
  const idx = text.toLowerCase().indexOf(span.toLowerCase());
  if (idx < 0) return null;
  return {
    cardId: m.id,
    term: span,
    before: text.slice(0, idx),
    blank: text.slice(idx, idx + span.length),
    after: text.slice(idx + span.length),
    source: 'context',
  };
}
