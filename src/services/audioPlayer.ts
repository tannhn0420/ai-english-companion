// ============================================
// Player audio TOÀN CỤC (một <audio> singleton sống ngoài React) —
// hàng đợi phát liên tục kiểu máy nghe nhạc: auto-next, MediaSession
// (điều khiển lock screen), sống sót khi chuyển màn hình.
// Track thiếu URL trực tiếp sẽ resolve lười khi đến lượt (fetch trang bài).
// ============================================

import { useSyncExternalStore } from 'react';

export interface Track {
  title: string;
  /** URL audio (đã proxy) nếu biết sẵn */
  url?: string;
  /** Resolve lười khi đến lượt phát (vd: phải mở trang bài mới có MP3) */
  resolve?: () => Promise<string | undefined>;
  /** Định danh bài (url bài viết) — màn hình dùng để biết track nào đang phát */
  link?: string;
}

export interface PlayerState {
  queue: Track[];
  index: number;
  playing: boolean;
  loading: boolean;
  time: number;
  duration: number;
}

let state: PlayerState = { queue: [], index: 0, playing: false, loading: false, time: 0, duration: 0 };
const listeners = new Set<() => void>();

function emit(patch: Partial<PlayerState>): void {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}

const el: HTMLAudioElement | null = typeof Audio !== 'undefined' ? new Audio() : null;
if (el) {
  el.preload = 'none';
  el.addEventListener('timeupdate', () =>
    emit({ time: el.currentTime, duration: el.duration || 0 }),
  );
  el.addEventListener('durationchange', () => emit({ duration: el.duration || 0 }));
  el.addEventListener('play', () => emit({ playing: true }));
  el.addEventListener('pause', () => emit({ playing: false }));
  el.addEventListener('ended', () => next());
  el.addEventListener('error', () => next()); // track hỏng → bỏ qua, phát tiếp
}

function setMediaSession(track: Track): void {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: 'VOA Learning English',
      album: 'AI English Companion',
    });
    navigator.mediaSession.setActionHandler('play', () => void el?.play());
    navigator.mediaSession.setActionHandler('pause', () => el?.pause());
    navigator.mediaSession.setActionHandler('nexttrack', () => next());
    navigator.mediaSession.setActionHandler('previoustrack', () => prev());
    navigator.mediaSession.setActionHandler('seekto', (d) => {
      if (el && d.seekTime != null) el.currentTime = d.seekTime;
    });
  } catch {
    /* best-effort */
  }
}

async function loadAndPlay(index: number): Promise<void> {
  const track = state.queue[index];
  if (!el || !track) {
    stop();
    return;
  }
  emit({ index, loading: true, time: 0, duration: 0 });
  let url = track.url;
  if (!url && track.resolve) {
    try {
      url = await track.resolve();
      track.url = url;
    } catch {
      url = undefined;
    }
  }
  if (!url) {
    // Không có audio → nhảy bài kế (tránh loop vô hạn khi cả queue hỏng)
    emit({ loading: false });
    if (index + 1 < state.queue.length) void loadAndPlay(index + 1);
    else stop();
    return;
  }
  el.src = url;
  setMediaSession(track);
  try {
    await el.play();
  } catch {
    /* autoplay bị chặn — user bấm ▶ ở mini player */
  }
  emit({ loading: false });
}

export function playQueue(tracks: Track[], startIndex = 0): void {
  emit({ queue: tracks });
  void loadAndPlay(startIndex);
}

export function toggle(): void {
  if (!el) return;
  if (el.paused) void el.play();
  else el.pause();
}

export function next(): void {
  if (state.index + 1 < state.queue.length) void loadAndPlay(state.index + 1);
  else stop();
}

export function prev(): void {
  if (!el) return;
  if (el.currentTime > 4 || state.index === 0) el.currentTime = 0;
  else void loadAndPlay(state.index - 1);
}

export function seek(time: number): void {
  if (el && Number.isFinite(time)) el.currentTime = Math.max(0, time);
}

export function stop(): void {
  if (el) {
    el.pause();
    el.removeAttribute('src');
  }
  emit({ queue: [], index: 0, playing: false, loading: false, time: 0, duration: 0 });
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function usePlayer(): PlayerState {
  return useSyncExternalStore(subscribe, () => state);
}
