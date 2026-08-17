// ============================================
// Speech-to-text qua Web Speech API (Chrome/Android/desktop).
// iOS Safari KHÔNG hỗ trợ (R1) → sttAvailable() = false, caller fallback ghi âm.
// ============================================

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

function Ctor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function sttAvailable(): boolean {
  return Ctor() !== null;
}

export interface SttHandle {
  stop(): void;
}

/**
 * Nghe một lượt: gọi onPartial khi có kết quả tạm, resolve transcript cuối cùng.
 * Trả handle để dừng sớm.
 */
export function listenOnce(
  lang: 'en' | 'vi',
  onPartial: (text: string) => void,
): { promise: Promise<string>; handle: SttHandle } {
  const C = Ctor();
  if (!C) return { promise: Promise.reject(new Error('no-stt')), handle: { stop() {} } };

  const rec = new C();
  rec.lang = lang === 'en' ? 'en-US' : 'vi-VN';
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let finalText = '';
  const promise = new Promise<string>((resolve, reject) => {
    rec.onresult = (e) => {
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const txt = r[0]?.transcript || '';
        if (r.isFinal) finalText += txt;
        else interim += txt;
      }
      onPartial((finalText + interim).trim());
    };
    rec.onerror = (ev) => reject(new Error(ev.error || 'stt-error'));
    rec.onend = () => resolve(finalText.trim());
  });

  try {
    rec.start();
  } catch {
    return { promise: Promise.reject(new Error('stt-start')), handle: { stop() {} } };
  }
  return { promise, handle: { stop: () => rec.stop() } };
}
