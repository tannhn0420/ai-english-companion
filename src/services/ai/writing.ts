// ============================================
// AI proofread (Phase 9) — port prompt writing assistant từ extension.
// 1 call tier 'good' cho cả bài; parse JSON qua core/aiJson.
// ============================================

import { extractJson } from '../../core/aiJson';
import type { ProofreadResult, WritingIssue, WritingIssueType } from '../../core/types';
import { complete } from './client';

const WRITING_SYSTEM_PROMPT = `You are a meticulous, encouraging English writing coach for a Vietnamese learner. You proofread and improve English text. You are precise: you never invent errors, you preserve the author's intended meaning, and every explanation you give is in clear, simple Vietnamese. You always answer with STRICT JSON only.`;

const WRITING_TEMPLATE = `Task: Fix ONLY real grammar, spelling, punctuation and word-choice errors. Preserve the author's meaning and voice; do not restyle correct sentences.

Return ONLY JSON (no code fences, no commentary), with this exact shape:
{
  "corrected": "<the improved full text>",
  "issues": [
    {"original":"<exact problematic span copied from the ORIGINAL text>","suggestion":"<the corrected span>","why":"<giải thích NGẮN GỌN bằng TIẾNG VIỆT vì sao sửa>","type":"grammar|spelling|word-choice|style|punctuation"}
  ],
  "level": "<CEFR level of the ORIGINAL text: one of A1,A2,B1,B2,C1,C2>"
}

Rules:
- List the most important changes only (max 8 issues), each with a Vietnamese "why".
- If the text is already correct, return "corrected" equal to the input and "issues": [].
- "corrected" must be plain text (no markdown), preserving line breaks.
- Keep the author's intended meaning; do not add new information.

Text:
{text}`;

const VALID_TYPES: WritingIssueType[] = ['grammar', 'spelling', 'word-choice', 'style', 'punctuation'];

export async function proofread(text: string): Promise<ProofreadResult> {
  const clean = text.trim();
  if (!clean) throw new Error('Hãy viết gì đó trước đã.');

  const raw = await complete({
    system: WRITING_SYSTEM_PROMPT,
    prompt: WRITING_TEMPLATE.replace('{text}', () => clean),
    tier: 'good',
  });
  const parsed = extractJson(raw) as Partial<ProofreadResult> | null;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Kết quả AI không hợp lệ — thử lại nhé.');
  }

  const issues: WritingIssue[] = Array.isArray(parsed.issues)
    ? parsed.issues
        .map((x) => {
          const o = (x || {}) as Partial<WritingIssue>;
          const type = VALID_TYPES.includes(o.type as WritingIssueType)
            ? (o.type as WritingIssueType)
            : 'grammar';
          return {
            original: String(o.original || '').trim(),
            suggestion: String(o.suggestion || '').trim(),
            why: String(o.why || '').trim(),
            type,
          };
        })
        .filter((i) => i.original && i.suggestion)
    : [];

  return {
    corrected: String(parsed.corrected || clean),
    issues,
    level: typeof parsed.level === 'string' ? parsed.level : undefined,
  };
}
