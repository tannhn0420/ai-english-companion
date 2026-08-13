// ============================================
// Tra từ — nguồn mở, KHÔNG AI (DATA.md §4):
// bundle IPA (offline) + dictionaryapi.dev (online, cache vĩnh viễn vào store `dict`).
// ============================================

import { getDictEntry, putDictEntry } from './db';
import { ipaFor } from './dataBundle';

export interface DictEntry {
  term: string; // lowercase, key của store
  ipa?: string;
  audio?: string; // URL audio người thật (thường từ Wikimedia)
  defs: string[]; // nghĩa tiếng Anh (tham khảo — meaning VI user tự nhập/AI Phase 4)
  example?: string;
  fetchedAt: number;
  miss?: boolean; // API không có từ này — cache cả kết quả trượt
}

const MISS_RETRY_MS = 7 * 86_400_000; // thử lại kết quả trượt sau 7 ngày

interface ApiPhonetic {
  text?: string;
  audio?: string;
}
interface ApiDefinition {
  definition: string;
  example?: string;
}
interface ApiMeaning {
  definitions: ApiDefinition[];
}
interface ApiEntry {
  phonetics?: ApiPhonetic[];
  meanings?: ApiMeaning[];
}

async function fetchFromApi(term: string, now: number): Promise<DictEntry> {
  const res = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`,
  );
  if (!res.ok) return { term, defs: [], fetchedAt: now, miss: true };

  const data = (await res.json()) as ApiEntry[];
  const entry = data[0];
  if (!entry) return { term, defs: [], fetchedAt: now, miss: true };

  const phonetics = entry.phonetics || [];
  const withAudio = phonetics.find((p) => p.audio);
  const ipa = (phonetics.find((p) => p.text)?.text || '').replace(/^\/|\/$/g, '') || undefined;

  const defs: string[] = [];
  let example: string | undefined;
  for (const m of entry.meanings || []) {
    for (const d of m.definitions) {
      if (defs.length < 3 && d.definition) defs.push(d.definition);
      if (!example && d.example) example = d.example;
    }
  }

  return { term, ipa, audio: withAudio?.audio || undefined, defs, example, fetchedAt: now };
}

/**
 * Tra một từ: cache → API → bundle IPA bù chỗ thiếu.
 * Trả null CHỈ khi offline và chưa từng cache (caller hiện message "cần mạng").
 */
export async function lookup(rawTerm: string, now: number): Promise<DictEntry | null> {
  const term = rawTerm.trim().toLowerCase();
  if (!term) return null;

  const cached = await getDictEntry(term);
  if (cached && !(cached.miss && now - cached.fetchedAt > MISS_RETRY_MS)) return cached;

  let entry: DictEntry;
  try {
    entry = await fetchFromApi(term, now);
  } catch {
    // offline — dùng cache cũ nếu có, hoặc chỉ IPA từ bundle
    if (cached) return cached;
    const ipa = await ipaFor(term);
    return ipa ? { term, ipa, defs: [], fetchedAt: now } : null;
  }

  if (!entry.ipa) entry.ipa = (await ipaFor(term)) ?? undefined;
  await putDictEntry(entry);
  return entry;
}
