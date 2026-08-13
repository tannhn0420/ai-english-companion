// ============================================
// Tách câu — port từ ai-translator-ext src/dictation/lib.ts.
// Dùng cho: bài đọc VOA (Phase 5), dictation (Phase 6).
// ============================================

const TIMESTAMP_RE = /\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3}\s*-->\s*\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3}/;
const CUE_INDEX_RE = /^\d+$/;
const YT_TIME_RE = /^\d{1,2}:\d{2}(?::\d{2})?$/; // dòng "0:12" / "1:02:33" trong transcript YouTube

/** Gỡ scaffolding phụ đề/transcript (timestamp, cue number, tag) → văn xuôi sạch. */
export function parseSource(raw: string): string {
  const text = (raw || '').replace(/\r/g, '');
  const out: string[] = [];
  for (let line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    if (t === 'WEBVTT' || t.startsWith('WEBVTT')) continue;
    if (TIMESTAMP_RE.test(t)) continue;
    if (CUE_INDEX_RE.test(t)) continue;
    if (YT_TIME_RE.test(t)) continue;
    line = line.replace(/<[^>]+>/g, '');
    if (line.trim()) out.push(line.trim());
  }
  const deduped: string[] = [];
  for (const l of out) {
    if (deduped[deduped.length - 1] !== l) deduped.push(l);
  }
  return deduped.join('\n').replace(/[ \t]+/g, ' ').trim();
}

/** Tách thành câu; câu quá dài (>180 ký tự) bẻ tiếp ở dấu phẩy. */
export function splitSentences(text: string): string[] {
  const lines = (text || '')
    .split(/\n+/)
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean);
  const result: string[] = [];
  for (const line of lines) {
    const parts = line.match(/[^.!?]+[.!?]+["'’)\]]*|\S[^.!?]*$/g) || [line];
    for (const raw of parts.map((s) => s.trim()).filter(Boolean)) {
      if (raw.length <= 180) {
        result.push(raw);
        continue;
      }
      let chunk = '';
      for (const piece of raw.split(/(,\s+)/)) {
        if ((chunk + piece).length > 180 && chunk.trim()) {
          result.push(chunk.trim());
          chunk = piece;
        } else {
          chunk += piece;
        }
      }
      if (chunk.trim()) result.push(chunk.trim());
    }
  }
  return result;
}
