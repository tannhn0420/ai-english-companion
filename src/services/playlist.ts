// ============================================
// TTS playlist engine (ARCHITECTURE §4.3) — đọc tuần tự danh sách câu
// bằng SpeechSynthesis: EN-only hoặc EN→VI, nghỉ giữa items chỉnh được.
// Wake Lock giữ màn hình khi phát (R7); MediaSession hiện control (best-effort).
// ============================================

import { getSettings } from './settings';
import { pickVoice } from './tts';

export interface PlayItem {
  en: string;
  vi?: string;
}

export type PlaylistMode = 'en' | 'en-vi';

export interface PlaylistOpts {
  mode: PlaylistMode;
  gapMs: number;
  rate?: number;
  title?: string; // MediaSession metadata
  onIndex?: (i: number) => void;
  onState?: (playing: boolean) => void;
  onEnd?: () => void;
}

export interface Playlist {
  play(from?: number): void;
  pause(): void;
  next(): void;
  prev(): void;
  stop(): void;
  readonly index: number;
}

export function createPlaylist(items: PlayItem[], opts: PlaylistOpts): Playlist {
  let i = 0;
  let playing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let wakeLock: { release(): Promise<void> } | null = null;

  const synth = window.speechSynthesis;

  async function acquireWakeLock() {
    try {
      wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      wakeLock = null; // không hỗ trợ / bị từ chối — vẫn phát bình thường
    }
  }

  function releaseWakeLock() {
    void wakeLock?.release().catch(() => {});
    wakeLock = null;
  }

  function setMediaSession() {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: items[i]?.en?.slice(0, 80) || opts.title || 'AI English Companion',
        artist: opts.title || 'Listening practice',
      });
      navigator.mediaSession.setActionHandler('play', () => play());
      navigator.mediaSession.setActionHandler('pause', () => pause());
      navigator.mediaSession.setActionHandler('nexttrack', () => next());
      navigator.mediaSession.setActionHandler('previoustrack', () => prev());
    } catch {
      /* best-effort */
    }
  }

  function speakText(text: string, lang: 'en' | 'vi'): Promise<void> {
    return new Promise((resolve) => {
      const s = getSettings();
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice(synth.getVoices(), lang, lang === 'en' ? s.ttsVoiceEn : s.ttsVoiceVi);
      if (v) u.voice = v;
      else u.lang = lang === 'en' ? 'en-US' : 'vi-VN';
      u.rate = opts.rate ?? s.ttsRate;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      synth.speak(u);
    });
  }

  async function playCurrent(): Promise<void> {
    const item = items[i];
    if (!item) {
      stop();
      opts.onEnd?.();
      return;
    }
    opts.onIndex?.(i);
    setMediaSession();
    await speakText(item.en, 'en');
    if (!playing) return;
    if (opts.mode === 'en-vi' && item.vi) {
      await new Promise((r) => (timer = setTimeout(r, 350)));
      if (!playing) return;
      await speakText(item.vi, 'vi');
    }
    if (!playing) return;
    timer = setTimeout(() => {
      i += 1;
      void playCurrent();
    }, opts.gapMs);
  }

  function play(from?: number) {
    if (from != null) i = from;
    if (playing) return;
    playing = true;
    opts.onState?.(true);
    void acquireWakeLock();
    void playCurrent();
  }

  function pause() {
    playing = false;
    clearTimeout(timer);
    synth.cancel();
    releaseWakeLock();
    opts.onState?.(false);
  }

  function jump(delta: number) {
    const wasPlaying = playing;
    pause();
    i = Math.min(items.length - 1, Math.max(0, i + delta));
    opts.onIndex?.(i);
    if (wasPlaying) play();
  }

  const next = () => jump(1);
  const prev = () => jump(-1);

  function stop() {
    pause();
    i = 0;
  }

  return {
    play,
    pause,
    next,
    prev,
    stop,
    get index() {
      return i;
    },
  };
}
