// ============================================
// Loader cho bundle nguồn mở trong public/data/v1 (DATA.md §3).
// Lazy: chỉ fetch khi màn hình cần; offline/thiếu file → null, không throw.
// ============================================

export interface NgslBundle {
  /** headword (lowercase) → band 1|2|3 */
  words: Record<string, number>;
  /** dạng biến thể (lowercase) → headword */
  variants: Record<string, string>;
}

export interface BundleManifest {
  schema: number;
  dir: string;
  built: string;
  sources: { name: string; url: string; license: string }[];
  counts: Record<string, number>;
}

const BASE = '/data/v1';

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}/${path}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

let ngslP: Promise<NgslBundle | null> | undefined;
let ipaP: Promise<Record<string, string> | null> | undefined;
let manifestP: Promise<BundleManifest | null> | undefined;

export function getNgsl(): Promise<NgslBundle | null> {
  ngslP ??= fetchJson<NgslBundle>('ngsl.json');
  return ngslP;
}

export function getManifest(): Promise<BundleManifest | null> {
  manifestP ??= fetchJson<BundleManifest>('manifest.json');
  return manifestP;
}

/** IPA offline cho từ lõi NGSL (từ cmudict-ipa). */
export async function ipaFor(term: string): Promise<string | null> {
  ipaP ??= fetchJson<Record<string, string>>('ipa-core.json');
  const map = await ipaP;
  if (!map) return null;
  const key = term.trim().toLowerCase();
  return map[key] ?? null;
}

/** Band NGSL của một từ (1–3), null nếu ngoài danh sách lõi. */
export async function bandOf(term: string): Promise<number | null> {
  const ngsl = await getNgsl();
  if (!ngsl) return null;
  const key = term.trim().toLowerCase();
  const head = ngsl.words[key] ? key : ngsl.variants[key];
  return head ? (ngsl.words[head] ?? null) : null;
}
