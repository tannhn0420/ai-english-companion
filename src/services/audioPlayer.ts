// ============================================
// Player audio TOÀN CỤC (một <audio> singleton sống ngoài React) —
// hàng đợi phát liên tục kiểu máy nghe nhạc: auto-next, MediaSession
// (điều khiển lock screen), sống sót khi chuyển màn hình.
// Track thiếu URL trực tiếp sẽ resolve lười khi đến lượt (fetch trang bài).
//
// Chống cascade (bug "Nghe tất cả" nhảy hết bài): mỗi lần load tăng `gen`,
// event của lần load cũ bị bỏ qua; chỉ auto-next khi audio LỖI THẬT
// (el.error != null), không phải khi đang đổi src; sau 3 bài lỗi liên tiếp
// thì dừng và báo lỗi thay vì nhảy câm.
// ============================================

import { useSyncExternalStore } from 'react';

export interface Track {
  title: string;
  url?: string;
  resolve?: () => Promise<string | undefined>;
  link?: string;
}

export interface PlayerState {
  queue: Track[];
  index: number;
  playing: boolean;
  loading: boolean;
  time: number;
  duration: number;
  error: string;
}

let state: PlayerState = {
  queue: [],
  index: 0,
  playing: false,
  loading: false,
  time: 0,
  duration: 0,
  error: '',
};
const listeners = new Set<() => void>();

function emit(patch: Partial<PlayerState>): void {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}

const el: HTMLAudioElement | null = typeof Audio !== 'undefined' ? new Audio() : null;
let gen = 0; // thế hệ load hiện tại — bỏ qua event của load cũ
let failStreak = 0;

if (el) {
  el.preload = 'auto';
  el.addEventListener('timeupdate', () => emit({ time: el.currentTime, duration: el.duration || 0 }));
  el.addEventListener('durationchange', () => emit({ duration: el.duration || 0 }));
  el.addEventListener('playing', () => {
    failStreak = 0;
    emit({ playing: true, loading: false, error: '' });
  });
  el.addEventListener('pause', () => emit({ playing: false }));
  el.addEventListener('ended', () => {
    failStreak = 0;
    next();
  });
  // CHỈ coi là hỏng khi có el.error thật (404/format), không phải abort do đổi src.
  el.addEventListener('error', () => {
    if (el.error) onUnplayable(state.index);
  });
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

/** Bài không phát được → thử bài kế, nhưng dừng sau 3 lỗi liên tiếp. */
function onUnplayable(index: number): void {
  failStreak += 1;
  if (failStreak >= 3) {
    failStreak = 0;
    emit({ playing: false, loading: false, error: 'errPlayback' });
    return;
  }
  if (index + 1 < state.queue.length) void loadAndPlay(index + 1);
  else {
    failStreak = 0;
    stop();
  }
}

async function loadAndPlay(index: number): Promise<void> {
  const my = ++gen;
  const track = state.queue[index];
  if (!el || !track) {
    stop();
    return;
  }
  emit({ index, loading: true, error: '', time: 0, duration: 0 });

  let url = track.url;
  if (!url && track.resolve) {
    try {
      url = await track.resolve();
      track.url = url;
    } catch {
      url = undefined;
    }
  }
  if (my !== gen) return; // đã có thao tác mới hơn — bỏ lần load này
  if (!url) {
    onUnplayable(index);
    return;
  }

  el.src = url;
  setMediaSession(track);
  try {
    await el.play();
  } catch {
    // Autoplay bị chặn (không mất gesture) — không phải lỗi audio.
    // Bỏ spinner để user bấm ▶ ở mini player (toggle chạy trong gesture).
    if (my === gen) emit({ loading: false });
  }
}

export function playQueue(tracks: Track[], startIndex = 0): void {
  failStreak = 0;
  emit({ queue: tracks, error: '' });
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

export function retry(): void {
  if (state.queue.length) {
    failStreak = 0;
    void loadAndPlay(state.index);
  }
}

export function stop(): void {
  gen++; // vô hiệu mọi load đang chờ
  if (el) {
    el.pause();
    el.removeAttribute('src');
    el.load();
  }
  emit({ queue: [], index: 0, playing: false, loading: false, time: 0, duration: 0, error: '' });
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function usePlayer(): PlayerState {
  return useSyncExternalStore(subscribe, () => state);
}
