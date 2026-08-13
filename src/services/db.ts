// ============================================
// IndexedDB (database `aec`) qua idb — schema ARCHITECTURE §3.2.
// Quy tắc migration (§9): MỌI thay đổi store/index → tăng DB_VERSION +
// upgrade chạy tuần tự từng bậc + fixture test data version cũ.
// ============================================

import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { Mistake, PracticePack, VocabCard } from '../core/types';
import type { DictEntry } from './dict';

export const DB_VERSION = 1;

interface AecDB extends DBSchema {
  cards: {
    key: string;
    value: VocabCard;
    indexes: { due: number; topic: string };
  };
  packs: {
    key: string; // `${topic}|${level}`
    value: { key: string; pack: PracticePack; level: string; createdAt: number };
  };
  dictationSessions: {
    key: string;
    value: { id: string } & Record<string, unknown>;
  };
  dict: {
    key: string; // term đã chuẩn hóa lowercase
    value: DictEntry;
  };
  mistakes: {
    key: string;
    value: Mistake;
    indexes: { due: number; type: string };
  };
  journal: {
    key: string;
    value: { id: string; date: string } & Record<string, unknown>;
    indexes: { date: string };
  };
  meta: {
    key: string;
    value: { key: string; value: unknown };
  };
}

let dbPromise: Promise<IDBPDatabase<AecDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<AecDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AecDB>('aec', DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const cards = db.createObjectStore('cards', { keyPath: 'id' });
          cards.createIndex('due', 'due');
          cards.createIndex('topic', 'topic');
          db.createObjectStore('packs', { keyPath: 'key' });
          db.createObjectStore('dictationSessions', { keyPath: 'id' });
          db.createObjectStore('dict', { keyPath: 'term' });
          const mistakes = db.createObjectStore('mistakes', { keyPath: 'id' });
          mistakes.createIndex('due', 'due');
          mistakes.createIndex('type', 'type');
          const journal = db.createObjectStore('journal', { keyPath: 'id' });
          journal.createIndex('date', 'date');
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// ---- Cards ----

export async function getAllCards(): Promise<VocabCard[]> {
  const db = await getDb();
  return db.getAll('cards');
}

export async function putCard(card: VocabCard): Promise<void> {
  const db = await getDb();
  await db.put('cards', card);
}

/** Bulk trong MỘT transaction — import nghìn thẻ không chớp UI. */
export async function putCards(cards: VocabCard[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('cards', 'readwrite');
  for (const c of cards) void tx.store.put(c);
  await tx.done;
}

/** Xóa theo yêu cầu user — ghi tombstone (meta `tombstones`) để sync lan truyền xóa. */
export async function deleteCard(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('cards', id);
  await addTombstones([id]);
}

/** Xóa do sync pull (tombstone từ máy khác) — KHÔNG tạo tombstone mới. */
export async function deleteCardRaw(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('cards', id);
}

export async function clearCards(): Promise<void> {
  const db = await getDb();
  const ids = (await db.getAllKeys('cards')) as string[];
  await db.clear('cards');
  await addTombstones(ids);
}

async function addTombstones(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const now = Date.now();
  const map = await getMeta<Record<string, number>>('tombstones', {});
  for (const id of ids) map[id] = now;
  await setMeta('tombstones', map);
}

export async function countCards(): Promise<number> {
  const db = await getDb();
  return db.count('cards');
}

/** Số thẻ đến hạn — dùng index `due`, không load cả deck. */
export async function countDue(now: number): Promise<number> {
  const db = await getDb();
  return db.countFromIndex('cards', 'due', IDBKeyRange.upperBound(now));
}

// ---- Dict cache ----

export async function getDictEntry(term: string): Promise<DictEntry | undefined> {
  const db = await getDb();
  return db.get('dict', term);
}

export async function putDictEntry(entry: DictEntry): Promise<void> {
  const db = await getDb();
  await db.put('dict', entry);
}

// ---- Meta (key-value, giữ tên key như extension để phase sync map 1-1) ----

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const db = await getDb();
  const row = await db.get('meta', key);
  return row ? (row.value as T) : fallback;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put('meta', { key, value });
}
