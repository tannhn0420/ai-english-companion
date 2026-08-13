// ============================================
// AI client — provider-agnostic (ARCHITECTURE §4.2), port lỗi tiếng Việt
// từ services/gemini.ts + openai.ts của extension.
// Model routing theo tier: 'cheap' (gloss/pack/dịch) | 'good' (feedback/assessment).
// ============================================

import { getSettings } from '../settings';

export type AiProvider = 'gemini' | 'groq' | 'openrouter' | 'openai';
export type Tier = 'cheap' | 'good';

export const PROVIDER_DEFAULT_MODEL: Record<AiProvider, string> = {
  gemini: 'gemini-flash-latest',
  groq: 'llama-3.1-8b-instant',
  openrouter: 'openai/gpt-4o-mini',
  openai: 'gpt-4o-mini',
};

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function baseUrlOf(provider: AiProvider, custom: string): string {
  if (provider === 'groq') return 'https://api.groq.com/openai/v1';
  if (provider === 'openrouter') return 'https://openrouter.ai/api/v1';
  return custom || 'https://api.openai.com/v1';
}

export function hasAiKey(): boolean {
  return getSettings().aiKey.trim().length > 0;
}

function modelFor(tier: Tier): string {
  const s = getSettings();
  if (tier === 'good' && s.aiModelGood.trim()) return s.aiModelGood.trim();
  return s.aiModel.trim() || PROVIDER_DEFAULT_MODEL[s.aiProvider];
}

export interface CompleteOpts {
  system: string;
  prompt: string;
  tier?: Tier;
  maxTokens?: number;
  temperature?: number;
}

/** Gọi model, trả text. Throw Error với message tiếng Việt thân thiện (§10). */
export async function complete(opts: CompleteOpts): Promise<string> {
  const s = getSettings();
  const key = s.aiKey.trim();
  if (!key) throw new Error('Chưa có API key — vào Cài đặt → AI để nhập.');

  const model = modelFor(opts.tier ?? 'cheap');
  const temperature = opts.temperature ?? 0.3;
  const maxTokens = opts.maxTokens ?? 8192;

  if (s.aiProvider === 'gemini') {
    const res = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: opts.system }] },
        contents: [{ parts: [{ text: opts.prompt }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
    });
    if (!res.ok) throw httpError(res.status, await safeMessage(res));
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      error?: { message?: string };
    };
    if (data.error) throw new Error(`Gemini: ${data.error.message}`);
    const parts = data.candidates?.[0]?.content?.parts;
    if (!parts?.length) {
      throw new Error('AI không trả nội dung (có thể bị bộ lọc an toàn chặn). Thử lại nhé.');
    }
    return parts.map((p) => p.text || '').join('').trim();
  }

  // OpenAI-compatible: groq / openrouter / openai(+custom baseUrl)
  const res = await fetch(`${baseUrlOf(s.aiProvider, s.aiBaseUrl)}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw httpError(res.status, await safeMessage(res));
  const data = (await res.json()) as {
    choices?: { message?: { content?: unknown } }[];
    error?: { message?: string };
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error(data.error?.message || 'AI không trả nội dung.');
  return content.trim();
}

/** Gọi thử 1 request tí hon để kiểm tra key. */
export async function validateKey(): Promise<boolean> {
  try {
    await complete({ system: 'Reply with OK.', prompt: 'ping', maxTokens: 5 });
    return true;
  } catch {
    return false;
  }
}

async function safeMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: { message?: string } };
    return j.error?.message || res.statusText;
  } catch {
    return res.statusText;
  }
}

function httpError(status: number, detail: string): Error {
  if (status === 400 || status === 401) return new Error('API key không hợp lệ — kiểm tra Cài đặt → AI.');
  if (status === 403) return new Error('API key không có quyền truy cập model này.');
  if (status === 429) return new Error('Vượt giới hạn API — chờ chút rồi thử lại, hoặc đổi provider.');
  return new Error(`Lỗi API ${status}: ${detail}`);
}
