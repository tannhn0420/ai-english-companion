// ============================================
// Import/Export — port từ ai-translator-ext src/flashcards/lib.ts +
// logic dedupe của services/storage.ts (importVocabCards).
// Tương thích 100% format extension (D8): JSON backup giữ nguyên mọi field
// (kể cả SRS + id); CSV/TSV tạo input mới.
// ============================================

import type { Language, VocabCard, VocabCardInput } from './types';
import { createCard } from './srs';

const VI_RE =
  /[àáãạảăắằẳẵặâấầẩẫậèéẹẻẽêềếểễệđìíĩỉịòóõọỏôốồổỗộơớờởỡợùúũụủưứừửữựỳýỵỷỹ]/i;

export function detectLang(s: string): Language {
  return VI_RE.test(s) ? 'vi' : 'en';
}

/** Khóa dedupe — giống extension: cùng ngôn ngữ + cùng term (chuẩn hóa). */
export function dedupeKey(c: Pick<VocabCard, 'term' | 'lang'>): string {
  return `${c.lang}|${c.term.trim().toLowerCase()}`;
}

// ---- Export ----

function csvEscape(s: string): string {
  const v = (s || '').replace(/\r?\n/g, ' ');
  return /[",]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCSV(deck: VocabCard[]): string {
  const header = 'term,meaning,ipa,example,topic,lang';
  const rows = deck.map((c) =>
    [c.term, c.meaning, c.ipa || '', c.example || '', c.topic || '', c.lang]
      .map(csvEscape)
      .join(','),
  );
  return [header, ...rows].join('\n');
}

export function toTSV(deck: VocabCard[]): string {
  // Anki: tab = ngăn field, newline = ngăn record → strip cả hai khỏi nội dung.
  const flat = (s: string) => s.replace(/[\t\r\n]+/g, ' ');
  return deck
    .map((c) => {
      const back = flat(
        [c.meaning, c.ipa ? `/${c.ipa.replace(/^\/|\/$/g, '')}/` : '', c.example]
          .filter(Boolean)
          .join('  ·  '),
      );
      return `${flat(c.term)}\t${back}`;
    })
    .join('\n');
}

export function toJSON(deck: VocabCard[]): string {
  return JSON.stringify(deck, null, 2);
}

export type ExportFormat = 'json' | 'csv' | 'tsv';

export function serialize(deck: VocabCard[], format: ExportFormat): string {
  if (format === 'json') return toJSON(deck);
  if (format === 'csv') return toCSV(deck);
  return toTSV(deck);
}

// ---- Import ----

function parseDelimLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === delim) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

const KNOWN_COLS = ['term', 'meaning', 'ipa', 'example', 'topic', 'lang'];

/**
 * Parse file import thành card-shaped objects. JSON (backup) giữ nguyên shape
 * đầy đủ; CSV/TSV cho ra input mới. `normalizeImported` quyết định restore hay tạo mới.
 */
export function parseImport(filename: string, text: string): Array<VocabCardInput | VocabCard> {
  const lower = filename.toLowerCase();
  const trimmed = text.trim();

  if (lower.endsWith('.json') || trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed);
      const arr: unknown[] = Array.isArray(data)
        ? data
        : (data.cards as unknown[]) || (data.deck as unknown[]) || [];
      return arr
        .map((r) => {
          const it = r as Partial<VocabCard>;
          if (!it || !it.term) return null;
          const lang: Language =
            it.lang === 'en' || it.lang === 'vi' ? it.lang : detectLang(it.term);
          return { ...it, term: it.term, meaning: it.meaning || '', lang } as
            | VocabCardInput
            | VocabCard;
        })
        .filter(Boolean) as Array<VocabCardInput | VocabCard>;
    } catch {
      // rơi xuống parse delimited
    }
  }

  const delim =
    lower.endsWith('.tsv') || (!lower.endsWith('.csv') && text.includes('\t')) ? '\t' : ',';
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const firstCols = parseDelimLine(lines[0], delim).map((h) => h.trim().toLowerCase());
  const hasHeader = firstCols.some((h) => KNOWN_COLS.includes(h));
  const cols = hasHeader ? firstCols : KNOWN_COLS;
  const rows = hasHeader ? lines.slice(1) : lines;

  const cards: VocabCardInput[] = [];
  for (const line of rows) {
    const vals = parseDelimLine(line, delim);
    const rec: Record<string, string> = {};
    cols.forEach((c, i) => {
      rec[c] = (vals[i] || '').trim();
    });
    const term = rec.term;
    if (!term) continue;
    const lang: Language = rec.lang === 'en' || rec.lang === 'vi' ? rec.lang : detectLang(term);
    cards.push({
      term,
      meaning: rec.meaning || '',
      ipa: rec.ipa || undefined,
      example: rec.example || undefined,
      topic: rec.topic || undefined,
      lang,
    });
  }
  return cards;
}

/**
 * Chuẩn hóa item đã parse thành VocabCard đầy đủ:
 * - Backup JSON (có id + createdAt): GIỮ NGUYÊN mọi field, chỉ điền SRS thiếu
 *   (thẻ cũ không mất tiến độ) và `updatedAt` mặc định = createdAt.
 * - Input mới (CSV/TSV/JSON thiếu id): tạo thẻ mới qua createCard.
 */
export function normalizeImported(
  items: Array<VocabCardInput | VocabCard>,
  now: number,
): VocabCard[] {
  return items
    .filter((it) => it.term?.trim())
    .map((it) => {
      const full = it as Partial<VocabCard>;
      if (full.id && typeof full.createdAt === 'number') {
        const createdAt = full.createdAt;
        return {
          ...full,
          term: full.term!.trim(),
          meaning: (full.meaning || '').trim(),
          lang: full.lang === 'vi' ? 'vi' : 'en',
          createdAt,
          due: typeof full.due === 'number' ? full.due : now,
          interval: typeof full.interval === 'number' ? full.interval : 0,
          ease: typeof full.ease === 'number' ? full.ease : 2.5,
          reps: typeof full.reps === 'number' ? full.reps : 0,
          lapses: typeof full.lapses === 'number' ? full.lapses : 0,
          updatedAt: typeof full.updatedAt === 'number' ? full.updatedAt : createdAt,
        } as VocabCard;
      }
      return createCard(it as VocabCardInput, now);
    });
}

/** Gộp thẻ import vào deck: dedupe trong file lẫn với deck hiện có (một lượt). */
export function mergeImport(
  existing: VocabCard[],
  incoming: VocabCard[],
): { toAdd: VocabCard[]; added: number; skipped: number } {
  const seen = new Set(existing.map(dedupeKey));
  const toAdd: VocabCard[] = [];
  let skipped = 0;
  for (const c of incoming) {
    if (!c.term.trim() || !c.meaning.trim()) {
      skipped++;
      continue;
    }
    const key = dedupeKey(c);
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    toAdd.push(c);
  }
  return { toAdd, added: toAdd.length, skipped };
}
