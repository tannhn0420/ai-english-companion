// ============================================
// Prompt templates — port NGUYÊN VĂN từ utils/constants.ts của extension
// (đã tinh chỉnh sẵn, không viết lại — ARCHITECTURE §4.2).
// ============================================

export const PRACTICE_SYSTEM_PROMPT = `You are an encouraging English tutor creating SPEAKING & LISTENING practice for a Vietnamese learner. Write the way people actually talk in everyday life — natural spoken English with contractions, fillers used sparingly, real reactions and follow-ups — not textbook sentences. Provide accurate Vietnamese translations and correct General American IPA. Keep everything genuinely practical for the topic. Return only what the format asks — no commentary.`;

export const PRACTICE_TEMPLATE = `Create English practice material for the request below.

{text}

Return ONLY a JSON object in EXACTLY this shape (no markdown, no code fences):
{
  "vocab": [ { "term": "<word or short phrase>", "ipa": "<IPA without slashes>", "meaning": "<short Vietnamese meaning>", "example": "<natural English example sentence>" } ],
  "phrases": [ { "en": "<useful everyday spoken sentence for this topic>", "vi": "<Vietnamese translation>" } ],
  "dialogue": [ { "speaker": "A", "en": "<a natural line of everyday conversation>", "vi": "<Vietnamese translation>" } ],
  "passage": [ { "en": "<one sentence of a short spoken monologue about the topic>", "vi": "<Vietnamese translation>" } ]
}

Rules:
- vocab: 20 items (mix single words, phrasal verbs, and common collocations/idioms real speakers use).
- phrases: 20 items — natural DAILY-SPEAKING expressions for this topic (reactions, requests, small talk, useful chunks), not generic textbook lines.
- dialogue: a realistic everyday conversation of 12-16 alternating lines (speakers A and B). It should flow like real life: greetings, back-and-forth, follow-up questions, natural reactions and a natural ending. Sentences can vary in length like real speech, but stay speakable.
- passage: a coherent, natural spoken MONOLOGUE about the topic (someone talking about it in the first person) of 8-12 sentences, split into ONE sentence per array item. Clear but natural — ideal for listening and dictation.
- Match the requested level (simpler wording for beginner, richer for advanced) but always sound natural and spoken.
- IPA must be correct General American. Vietnamese must read naturally.`;

/** Ghép phần {text} của PRACTICE_TEMPLATE — giống handleGeneratePractice extension. */
export function buildPracticeText(topic: string, level: string, words: string[]): string {
  return (
    `Topic: ${topic}\nLevel: ${level}` +
    (words.length
      ? `\n\nIMPORTANT: The learner is revising these specific words. Make the "vocab" list EXACTLY these words (add correct IPA, a short Vietnamese meaning, and a natural example for each), and write the phrases and the dialogue so they naturally reuse these words: ${words.join(', ')}`
      : '')
  );
}
