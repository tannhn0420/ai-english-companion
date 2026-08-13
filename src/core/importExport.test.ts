import { describe, expect, it } from 'vitest';
import {
  detectLang,
  mergeImport,
  normalizeImported,
  parseImport,
  serialize,
  toCSV,
} from './importExport';
import type { VocabCard } from './types';

const NOW = 1_750_000_000_000;

/** The card đúng shape export của extension (mọi field, kể cả SRS + id). */
const extCard: VocabCard = {
  id: 'abc-123',
  term: 'meticulous',
  lang: 'en',
  meaning: 'ti mi, ky luong',
  ipa: 'mətɪkjələs',
  example: 'She kept meticulous records.',
  context: 'His meticulous notes saved the project.',
  sourceUrl: 'https://example.com/article',
  topic: 'work',
  createdAt: 1_700_000_000_000,
  due: 1_700_900_000_000,
  interval: 6,
  ease: 2.6,
  reps: 3,
  lapses: 1,
};

describe('parseImport + normalizeImported: JSON backup tu extension', () => {
  it('giu nguyen 100% field, khong reset tien do SRS (AC Phase 1)', () => {
    const json = JSON.stringify([extCard], null, 2);
    const cards = normalizeImported(parseImport('ai-translator-vocab.json', json), NOW);
    expect(cards).toHaveLength(1);
    const c = cards[0];
    expect(c).toMatchObject(extCard);
    // updatedAt duoc dien mac dinh = createdAt (field moi, optional)
    expect(c.updatedAt).toBe(extCard.createdAt);
  });

  it('roundtrip: export JSON roi parse lai ra deck tuong duong', () => {
    const cards = normalizeImported(parseImport('x.json', JSON.stringify([extCard])), NOW);
    const again = normalizeImported(parseImport('x.json', serialize(cards, 'json')), NOW);
    expect(again[0]).toEqual(cards[0]);
  });

  it('the JSON thieu field SRS: dien mac dinh, khong vut the', () => {
    const partial = { id: 'p1', term: 'hello', meaning: 'xin chao', createdAt: 123 };
    const [c] = normalizeImported(parseImport('x.json', JSON.stringify([partial])), NOW);
    expect(c.due).toBe(NOW);
    expect(c.ease).toBe(2.5);
    expect(c.interval).toBe(0);
    expect(c.reps).toBe(0);
    expect(c.lapses).toBe(0);
  });

  it('JSON khong co term: bo qua; text rac lot qua parser nhung merge chan (thieu meaning)', () => {
    expect(parseImport('x.json', JSON.stringify([{ meaning: 'mo coi term' }]))).toHaveLength(0);
    // Parser de tinh giong extension: 1 dong text = 1 row chi co term...
    const garbage = normalizeImported(parseImport('x.bin', '  not a deck'), NOW);
    // ...nhung lop merge tu choi the khong co meaning.
    expect(mergeImport([], garbage).added).toBe(0);
  });
});

describe('parseImport: CSV/TSV', () => {
  it('CSV co header, gia tri chua dau phay trong ngoac kep', () => {
    const csv =
      'term,meaning,ipa,example,topic,lang\n"come up, with",nghi ra,,"He came up, quickly",phrasal,en';
    const items = parseImport('deck.csv', csv);
    expect(items).toHaveLength(1);
    expect(items[0].term).toBe('come up, with');
    expect(items[0].meaning).toBe('nghi ra');
  });

  it('CSV khong header: dung thu tu cot chuan; tu detect lang tieng Viet', () => {
    const items = parseImport('deck.csv', 'xin chào,hello');
    expect(items[0].lang).toBe('vi');
    expect(detectLang('meticulous')).toBe('en');
  });

  it('TSV 2 cot kieu Anki', () => {
    const items = parseImport('deck.tsv', 'resilient\tkien cuong');
    expect(items[0].term).toBe('resilient');
    expect(items[0].meaning).toBe('kien cuong');
  });

  it('CSV tao the moi: due = now, co id', () => {
    const [c] = normalizeImported(parseImport('d.csv', 'term,meaning\nhello,xin chao'), NOW);
    expect(c.id).toBeTruthy();
    expect(c.due).toBe(NOW);
    expect(c.createdAt).toBe(NOW);
  });
});

describe('serialize', () => {
  it('CSV escape dung dau phay/ngoac kep, newline nen thanh space', () => {
    const card: VocabCard = { ...extCard, meaning: 'a "b", c', example: 'line1\nline2' };
    const csv = toCSV([card]);
    expect(csv.split('\n')[1]).toContain('"a ""b"", c"');
    expect(csv).toContain('line1 line2');
  });

  it('TSV: IPA boc /../, khong con tab/newline trong noi dung', () => {
    const tsv = serialize([extCard], 'tsv');
    const [front, back] = tsv.split('\t');
    expect(front).toBe('meticulous');
    expect(back).toContain('/mətɪkjələs/');
    expect(back).not.toMatch(/[\t\n]/);
  });
});

describe('mergeImport: dedupe giong extension', () => {
  it('trung lang+term (khong phan biet hoa thuong) -> skip; thieu meaning -> skip', () => {
    const existing = normalizeImported([extCard], NOW);
    const incoming = normalizeImported(
      parseImport('d.csv', 'term,meaning\nMETICULOUS,da co roi\nbrand-new,moi tinh\nno-meaning,'),
      NOW,
    );
    const { added, skipped, toAdd } = mergeImport(existing, incoming);
    expect(added).toBe(1);
    expect(skipped).toBe(2);
    expect(toAdd[0].term).toBe('brand-new');
  });

  it('dedupe ca ben trong file import', () => {
    const incoming = normalizeImported(
      parseImport('d.csv', 'term,meaning\ndouble,kep\nDouble,kep nua'),
      NOW,
    );
    const { added, skipped } = mergeImport([], incoming);
    expect(added).toBe(1);
    expect(skipped).toBe(1);
  });
});
