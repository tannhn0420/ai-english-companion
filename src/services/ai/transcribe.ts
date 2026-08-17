// ============================================
// Tạo transcript từ audio bằng Gemini (nghe hiểu audio). Dùng cho podcast/
// bài VOA không có transcript sẵn trên web. CHỈ Gemini hỗ trợ audio input;
// provider khác báo lỗi rõ ràng.
// ============================================

import { getSettings } from '../settings';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_BYTES = 18 * 1024 * 1024; // inline_data ~ giới hạn 20MB request

function toBase64(buf: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const TRANSCRIBE_PROMPT =
  'Transcribe this English audio verbatim. Return ONLY the transcript as plain text with normal sentence punctuation — no timestamps, no speaker labels, no commentary.';

/** Gọi Gemini với 1 phần audio inline + prompt. Trả text. Chung cho transcript & chấm nói. */
export async function geminiAudio(
  bytes: ArrayBuffer,
  mime: string,
  prompt: string,
  opts?: { temperature?: number; maxOutputTokens?: number },
): Promise<string> {
  const s = getSettings();
  if (s.aiProvider !== 'gemini') {
    throw new Error('Tính năng này cần provider Gemini (đổi trong Cài đặt → AI).');
  }
  const key = s.aiKey.trim();
  if (!key) throw new Error('Chưa có API key — vào Cài đặt → AI.');
  if (bytes.byteLength > MAX_BYTES) {
    throw new Error('Audio quá dài — thử đoạn ngắn hơn.');
  }
  const model = s.aiModel.trim() || 'gemini-flash-latest';
  const r = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: toBase64(bytes) } }],
        },
      ],
      generationConfig: {
        temperature: opts?.temperature ?? 0,
        maxOutputTokens: opts?.maxOutputTokens ?? 8192,
      },
    }),
  });
  if (!r.ok) {
    if (r.status === 429) throw new Error('Vượt giới hạn API — chờ chút rồi thử lại.');
    throw new Error(`Lỗi Gemini audio (HTTP ${r.status}).`);
  }
  const data = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim() || '';
  if (!text) throw new Error('AI không trả kết quả — thử lại nhé.');
  return text;
}

/** Tải MP3 (qua proxy cùng origin) → gửi Gemini → transcript thô. */
export async function transcribeAudioUrl(proxiedUrl: string): Promise<string> {
  const res = await fetch(proxiedUrl);
  if (!res.ok) throw new Error('Không tải được audio để tạo transcript.');
  return geminiAudio(await res.arrayBuffer(), 'audio/mpeg', TRANSCRIBE_PROMPT);
}

/** Transcript từ blob ghi âm (mic) — dùng cho luyện nói trên iOS (không STT). */
export async function transcribeBlob(blob: Blob): Promise<string> {
  return geminiAudio(await blob.arrayBuffer(), blob.type || 'audio/webm', TRANSCRIBE_PROMPT);
}
