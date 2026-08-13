// Fixture test migration (ARCHITECTURE §9): data ghi ở DB version 1
// phải sống sót nguyên vẹn khi mở bằng version hiện tại.
import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import { getAllCards, getDb, DB_VERSION } from './db';

const V1_CARD = {
  id: 'mig-1',
  term: 'resilient',
  lang: 'en',
  meaning: 'kien cuong',
  createdAt: 1_700_000_000_000,
  due: 1_700_900_000_000,
  interval: 6,
  ease: 2.6,
  reps: 3,
  lapses: 1,
};

describe('DB migration v1 -> hien tai', () => {
  it('the o v1 giu nguyen; store moi (articles) duoc tao', async () => {
    // 1) Dung DB dung schema v1 va ghi fixture
    const v1 = await openDB('aec', 1, {
      upgrade(db) {
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
      },
    });
    await v1.put('cards', V1_CARD);
    v1.close();

    // 2) Mo bang module that (version hien tai) -> upgrade v2 chay
    const db = await getDb();
    expect(db.version).toBe(DB_VERSION);
    expect([...db.objectStoreNames]).toContain('articles');

    // 3) Data cu nguyen ven
    const cards = await getAllCards();
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject(V1_CARD);
  });
});
