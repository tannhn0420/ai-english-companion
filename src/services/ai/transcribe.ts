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

/** Tải MP3 (qua proxy cùng origin) → gửi Gemini → transcript thô. */
export async function transcribeAudioUrl(proxiedUrl: string): Promise<string> {
  const s = getSettings();
  if (s.aiProvider !== 'gemini') {
    throw new Error('Tạo transcript từ audio cần provider Gemini (đổi trong Cài đặt → AI).');
  }
  const key = s.aiKey.trim();
  if (!key) throw new Error('Chưa có API key — vào Cài đặt → AI.');

  const res = await fetch(proxiedUrl);
  if (!res.ok) throw new Error('Không tải được audio để tạo transcript.');
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) {
    throw new Error('Audio quá dài để tạo transcript — thử một bài ngắn hơn.');
  }

  const model = s.aiModel.trim() || 'gemini-flash-latest';
  const r = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: 'Transcribe this English audio verbatim. Return ONLY the transcript as plain text with normal sentence punctuation — no timestamps, no speaker labels, no commentary.',
            },
            { inline_data: { mime_type: 'audio/mpeg', data: toBase64(buf) } },
          ],
        },
      ],
      generationConfig: { temperature: 0, maxOutputTokens: 8192 },
    }),
  });
  if (!r.ok) {
    if (r.status === 429) throw new Error('Vượt giới hạn API — chờ chút rồi thử lại.');
    throw new Error(`Lỗi tạo transcript (HTTP ${r.status}).`);
  }
  const data = (await r.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim() || '';
  if (!text) throw new Error('AI không tạo được transcript — thử lại nhé.');
  return text;
}
