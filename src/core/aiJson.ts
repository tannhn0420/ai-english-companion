// ============================================
// Parse output AI — port từ background/index.ts của extension:
// extractJson (chịu được code fence + rác quanh JSON) và normalizePack
// (ép PracticePack đúng shape, vứt item hỏng thay vì fail cả pack).
// ============================================

import type { PracticePack } from './types';

export function extractJson(raw: string): unknown {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(s);
  } catch {
    // rơi xuống cắt theo ngoặc
  }
  const firstObj = s.indexOf('{');
  const lastObj = s.lastIndexOf('}');
  const firstArr = s.indexOf('[');
  const lastArr = s.lastIndexOf(']');
  const candidates: string[] = [];
  if (firstArr !== -1 && lastArr > firstArr) candidates.push(s.slice(firstArr, lastArr + 1));
  if (firstObj !== -1 && lastObj > firstObj) candidates.push(s.slice(firstObj, lastObj + 1));
  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      // thử candidate kế
    }
  }
  return null;
}

export function normalizePack(parsed: unknown, topic: string): PracticePack {
  const p = (parsed || {}) as Record<string, unknown>;
  const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
  return {
    topic,
    vocab: arr(p.vocab)
      .map((x) => {
        const o = (x || {}) as Record<string, unknown>;
        return {
          term: str(o.term),
          ipa: str(o.ipa) || undefined,
          meaning: str(o.meaning),
          example: str(o.example) || undefined,
        };
      })
      .filter((v) => v.term && v.meaning),
    phrases: arr(p.phrases)
      .map((x) => {
        const o = (x || {}) as Record<string, unknown>;
        return { en: str(o.en), vi: str(o.vi) };
      })
      .filter((v) => v.en),
    dialogue: arr(p.dialogue)
      .map((x) => {
        const o = (x || {}) as Record<string, unknown>;
        return { speaker: str(o.speaker) || 'A', en: str(o.en), vi: str(o.vi) };
      })
      .filter((v) => v.en),
    passage: arr(p.passage)
      .map((x) => {
        const o = (x || {}) as Record<string, unknown>;
        return { en: str(o.en), vi: str(o.vi) };
      })
      .filter((v) => v.en),
  };
}
