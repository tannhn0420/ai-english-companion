// ============================================
// TTS — port từ ai-translator-ext src/utils/voice.ts (pickVoice/sortedVoices)
// + hàm speak dùng settings.
// ============================================

import { getSettings } from './settings';

export function isNaturalVoice(v: SpeechSynthesisVoice): boolean {
  return /natural|neural|online|google|wavenet/i.test(v.name);
}

function score(v: SpeechSynthesisVoice, lang: 'en' | 'vi'): number {
  const name = v.name.toLowerCase();
  let s = 0;
  if ((v.lang || '').toLowerCase().startsWith(lang)) s += 100;
  if (/natural|neural/.test(name)) s += 50;
  if (/wavenet/.test(name)) s += 45;
  if (/online/.test(name)) s += 25;
  if (/google/.test(name)) s += 20;
  if (/microsoft/.test(name)) s += 6;
  if (lang === 'en' && /(en-us|en-gb)/i.test(v.lang || '')) s += 3;
  return s;
}

/** Giọng để đọc: lựa chọn của user nếu có, không thì giọng tự nhiên tốt nhất. */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: 'en' | 'vi',
  preferredURI?: string,
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;
  if (preferredURI) {
    const exact = voices.find((v) => v.voiceURI === preferredURI);
    if (exact) return exact;
  }
  const matching = voices.filter((v) => (v.lang || '').toLowerCase().startsWith(lang));
  const pool = matching.length ? matching : voices;
  return pool.slice().sort((a, b) => score(b, lang) - score(a, lang))[0] || null;
}

/** Sắp voice cho dropdown: đúng ngôn ngữ trước, giọng tự nhiên trước, rồi theo tên. */
export function sortedVoices(
  voices: SpeechSynthesisVoice[],
  lang?: 'en' | 'vi',
): SpeechSynthesisVoice[] {
  return voices.slice().sort((a, b) => {
    if (lang) {
      const la = (a.lang || '').toLowerCase().startsWith(lang) ? 1 : 0;
      const lb = (b.lang || '').toLowerCase().startsWith(lang) ? 1 : 0;
      if (la !== lb) return lb - la;
    }
    const na = isNaturalVoice(a) ? 1 : 0;
    const nb = isNaturalVoice(b) ? 1 : 0;
    if (na !== nb) return nb - na;
    return a.name.localeCompare(b.name);
  });
}

/** Đọc một đoạn text; hủy phát âm đang chạy trước đó. */
export function speak(text: string, lang: 'en' | 'vi', opts?: { rate?: number }): void {
  if (!('speechSynthesis' in window) || !text) return;
  const s = getSettings();
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const v = pickVoice(voices, lang, lang === 'en' ? s.ttsVoiceEn : s.ttsVoiceVi);
  if (v) u.voice = v;
  else u.lang = lang === 'en' ? 'en-US' : 'vi-VN';
  u.rate = opts?.rate ?? s.ttsRate;
  window.speechSynthesis.speak(u);
}
