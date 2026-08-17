// ============================================
// Ghi âm qua MediaRecorder — fallback cho iOS (không có STT, R1) và cho
// chấm phát âm bằng Gemini audio. Trả Blob + objectURL để nghe lại.
// ============================================

export function recorderAvailable(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

export interface Recording {
  blob: Blob;
  url: string;
  mime: string;
}

export interface ActiveRecorder {
  stop(): Promise<Recording>;
}

export async function startRecording(): Promise<ActiveRecorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // Chọn mime trình duyệt hỗ trợ (Safari: mp4/aac; Chrome: webm/opus)
  const mime =
    ['audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  rec.start();

  return {
    stop: () =>
      new Promise<Recording>((resolve) => {
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const type = rec.mimeType || mime || 'audio/webm';
          const blob = new Blob(chunks, { type });
          resolve({ blob, url: URL.createObjectURL(blob), mime: type });
        };
        rec.stop();
      }),
  };
}
