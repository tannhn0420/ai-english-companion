// ============================================
// Hội thoại nhiệm vụ (Phase 10) — AI đóng vai, bám mục tiêu.
// 1 call/lượt (reply + mục tiêu đã đạt + gợi ý nhẹ); 1 call đánh giá cuối.
// ============================================

import { extractJson } from '../../core/aiJson';
import type { ChatMessage, MissionResult, Scenario, WritingIssue, WritingIssueType } from '../../core/types';
import { complete } from './client';

function transcript(messages: ChatMessage[]): string {
  return messages.map((m) => `${m.role === 'user' ? 'Learner' : 'You'}: ${m.text}`).join('\n');
}

function goalsBlock(s: Scenario): string {
  return s.goals.map((g, i) => `${i}: ${g}`).join('\n');
}

export interface TurnResult {
  reply: string;
  goalsMet: number[]; // index mục tiêu đã hoàn thành TÍNH ĐẾN LƯỢT NÀY
  hint?: string; // gợi ý tiếng Việt nếu learner bí (không bắt buộc)
}

/** Một lượt hội thoại: AI trả lời trong vai + cập nhật mục tiêu đã đạt. */
export async function conversationTurn(
  scenario: Scenario,
  messages: ChatMessage[],
): Promise<TurnResult> {
  const system = `You are roleplaying as ${scenario.role}, speaking with a Vietnamese English learner. Stay fully in character and in the situation. Speak like a real person out loud: contractions, short natural turns (1-2 sentences). Keep the conversation moving with a light follow-up. Match the learner's level; do not lecture.`;

  const prompt = `Situation: ${scenario.context}
The learner plays: ${scenario.you}.

The learner is trying to accomplish these GOALS (index: description in Vietnamese):
${goalsBlock(scenario)}

Conversation so far:
${transcript(messages)}

Give your NEXT single spoken turn in English, in character. Then judge which goals the learner has accomplished SO FAR based on the whole conversation.

Return ONLY JSON (no code fences):
{"reply":"<your next line in English>","goalsMet":[<indices of accomplished goals>],"hint":"<optional SHORT Vietnamese hint if the learner seems stuck, else empty>"}`;

  const raw = await complete({ system, prompt, tier: 'cheap', maxTokens: 500 });
  const p = (extractJson(raw) || {}) as Record<string, unknown>;
  const reply = typeof p.reply === 'string' && p.reply.trim() ? p.reply.trim() : '…';
  const goalsMet = Array.isArray(p.goalsMet)
    ? p.goalsMet.filter((x): x is number => typeof x === 'number')
    : [];
  const hint = typeof p.hint === 'string' && p.hint.trim() ? p.hint.trim() : undefined;
  return { reply, goalsMet, hint };
}

const VALID_TYPES: WritingIssueType[] = ['grammar', 'spelling', 'word-choice', 'style', 'punctuation'];

/** Đánh giá cuối phiên: đạt mục tiêu chưa + góp ý + lỗi để đổ vào sổ tay. */
export async function assessMission(
  scenario: Scenario,
  messages: ChatMessage[],
): Promise<MissionResult> {
  const system = `You are a kind English speaking coach reviewing a roleplay a Vietnamese learner just did. All feedback text must be in Vietnamese. Be specific and encouraging.`;
  const prompt = `Scenario: ${scenario.title} — the learner played ${scenario.you}.
Goals (Vietnamese): ${scenario.goals.join(' | ')}

Full conversation:
${transcript(messages)}

Assess ONLY the learner's English ("Learner:" lines). Return ONLY JSON (no code fences):
{
  "completed": <true if the learner accomplished the goals well>,
  "score": <0-100 overall communication score>,
  "feedback": "<2-3 sentences in Vietnamese: what went well and the main thing to improve>",
  "better": ["<1-3 more natural English versions of things the learner said awkwardly>"],
  "issues": [ {"original":"<learner's exact words>","suggestion":"<corrected English>","why":"<short Vietnamese>","type":"grammar|spelling|word-choice|style|punctuation"} ]
}`;

  const raw = await complete({ system, prompt, tier: 'good', maxTokens: 1500 });
  const p = (extractJson(raw) || {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const issues: WritingIssue[] = Array.isArray(p.issues)
    ? p.issues
        .map((x) => {
          const o = (x || {}) as Record<string, unknown>;
          const type = VALID_TYPES.includes(o.type as WritingIssueType)
            ? (o.type as WritingIssueType)
            : 'grammar';
          return { original: str(o.original), suggestion: str(o.suggestion), why: str(o.why), type };
        })
        .filter((i) => i.original && i.suggestion)
    : [];
  return {
    completed: Boolean(p.completed),
    score: typeof p.score === 'number' ? p.score : 0,
    feedback: str(p.feedback),
    better: Array.isArray(p.better) ? p.better.map(str).filter(Boolean) : [],
    issues,
  };
}
