import { useSyncExternalStore } from 'react';
import { vi } from './vi';
import { en } from './en';

export type MsgKey = keyof typeof vi;
export type Lang = 'vi' | 'en';

const DICTS: Record<Lang, Record<MsgKey, string>> = { vi, en };
const STORAGE_KEY = 'aec-lang';

let current: Lang = 'vi';
const listeners = new Set<() => void>();

/** Gọi 1 lần khi boot (main.tsx) — đọc lựa chọn đã lưu, set <html lang>. */
export function initI18n(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY) === 'en') current = 'en';
  } catch {
    /* private mode — dùng mặc định vi */
  }
  document.documentElement.lang = current;
}

export function getLang(): Lang {
  return current;
}

export function setLang(next: Lang): void {
  if (next === current) return;
  current = next;
  document.documentElement.lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

/** Tra string theo key; `params` thay chỗ giữ {name}. */
export function t(key: MsgKey, params?: Record<string, string | number>): string {
  let s = DICTS[current][key];
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Hook cho component: re-render khi đổi ngôn ngữ. */
export function useI18n() {
  const lang = useSyncExternalStore(subscribe, getLang);
  return { lang, setLang, t };
}
