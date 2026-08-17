// ============================================
// AI cho luyện nói (Phase 7) — port prompt IELTS assess + drill từ extension.
// IELTS: chấm từ AUDIO thật (Gemini nghe được → chấm phát âm chuẩn hơn transcript).
// ============================================

import { extractJson } from '../../core/aiJson';
import type { DrillPack, SpeakingAssessment } from '../../core/types';
import { complete } from './client';
import { geminiAudio } from './transcribe';

const IELTS_SYSTEM = `You are a certified IELTS Speaking examiner. Assess the candidate's spoken answer strictly against the official IELTS Speaking band descriptors, scoring EACH of the four criteria separately, in 0.5 steps from 0 to 9: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation. Overall band ≈ the average of the four (rounded to nearest 0.5). Be accurate and specific; quote the candidate's own words. You are LISTENING to the real audio, so judge Pronunciation from what you actually hear. All feedback text must be in Vietnamese.`;

const IELTS_JSON = `Return ONLY JSON (no code fences, no commentary):
{
  "overall": <number 0-9 in 0.5 steps>,
  "criteria": {
    "fluency":       { "band": <number>, "comment": "<Vietnamese, specific, cite words>" },
    "lexical":       { "band": <number>, "comment": "<Vietnamese>" },
    "grammar":       { "band": <number>, "comment": "<Vietnamese, note key errors>" },
    "pronunciation": { "band": <number>, "comment": "<Vietnamese, note specific sounds>" }
  },
  "strengths":    ["<Vietnamese>"],
  "improvements": ["<Vietnamese, actionable>"],
  "better": "<a natural Band 8+ model answer in English to the same question>"
}`;

function parseAssessment(raw: string): SpeakingAssessment {
  const p = extractJson(raw) as Partial<SpeakingAssessment> | null;
  if (!p || typeof p !== 'object' || !p.criteria) {
    throw new Error('Kết quả chấm không hợp lệ — thử lại nhé.');
  }
  return p as SpeakingAssessment;
}

/** Chấm IELTS từ audio ghi âm (Gemini nghe trực tiếp — chuẩn cả phát âm). */
export async function assessSpeakingAudio(
  blob: Blob,
  question: string,
): Promise<SpeakingAssessment> {
  const prompt = `${IELTS_SYSTEM}\n\nThe candidate is answering this IELTS-style question:\n"${question}"\n\n${IELTS_JSON}`;
  const raw = await geminiAudio(await blob.arrayBuffer(), blob.type || 'audio/webm', prompt, {
    maxOutputTokens: 2048,
  });
  return parseAssessment(raw);
}

/** Chấm IELTS từ transcript (khi dùng STT — không cần Gemini audio). */
export async function assessSpeakingTranscript(
  transcript: string,
  question: string,
): Promise<SpeakingAssessment> {
  const raw = await complete({
    system:
      IELTS_SYSTEM +
      ' NOTE: the answer below is an automatic speech-to-text transcript, so judge Pronunciation cautiously and say so in its comment.',
    prompt: `Question: ${question}\n\nCandidate answer (transcript): ${transcript}\n\n${IELTS_JSON}`,
    tier: 'good',
    maxTokens: 2048,
  });
  return parseAssessment(raw);
}

const DRILL_SYSTEM = `You are a pronunciation coach helping a Vietnamese learner master an English sound they commonly get wrong. Give accurate, practical material and clear Vietnamese guidance about the exact mistake Vietnamese speakers make and how to fix it.`;

const DRILL_TEMPLATE = `Target sound / contrast to drill: {text}

Return ONLY a JSON object (no markdown, no code fences):
{
  "tip": "<a short, concrete Vietnamese tip: how to physically produce this sound and the typical Vietnamese mistake to avoid>",
  "pairs": [ { "a": "<English word>", "b": "<contrasting English word>", "note": "<very short Vietnamese note>" } ],
  "sentences": [ { "en": "<a natural English sentence loaded with the target sound>", "vi": "<Vietnamese translation>" } ]
}

Rules:
- pairs: 8 minimal pairs that isolate the target sound/contrast.
- sentences: 6 natural, speakable sentences rich in the target sound.
- Keep everything real and useful; Vietnamese must read naturally.`;

export async function generateDrill(sound: string): Promise<DrillPack> {
  const raw = await complete({
    system: DRILL_SYSTEM,
    prompt: DRILL_TEMPLATE.replace('{text}', () => sound),
    tier: 'cheap',
  });
  const p = (extractJson(raw) || {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const asRec = (x: unknown) => (x || {}) as Record<string, unknown>;
  const pairs = Array.isArray(p.pairs)
    ? p.pairs
        .map((x) => {
          const o = asRec(x);
          return { a: str(o.a), b: str(o.b), note: str(o.note) || undefined };
        })
        .filter((x) => x.a)
    : [];
  const sentences = Array.isArray(p.sentences)
    ? p.sentences
        .map((x) => {
          const o = asRec(x);
          return { en: str(o.en), vi: str(o.vi) };
        })
        .filter((x) => x.en)
    : [];
  if (pairs.length === 0 && sentences.length === 0) {
    throw new Error('Không tạo được bài luyện âm — thử âm khác.');
  }
  return { sound, tip: str(p.tip), pairs, sentences };
}
