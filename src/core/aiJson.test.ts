import { describe, expect, it } from 'vitest';
import { extractJson, normalizePack } from './aiJson';

describe('extractJson', () => {
  it('parse JSON tran, JSON trong code fence, va JSON co rac bao quanh', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Here you go:\n{"a":1}\nHope that helps!')).toEqual({ a: 1 });
    expect(extractJson('text [1,2] text')).toEqual([1, 2]);
  });

  it('khong co JSON -> null', () => {
    expect(extractJson('xin loi, toi khong the')).toBeNull();
  });
});

describe('normalizePack', () => {
  it('ep dung shape, vut item hong, giu item tot', () => {
    const pack = normalizePack(
      {
        vocab: [
          { term: 'book a table', ipa: 'bʊk', meaning: 'dat ban', example: 'I booked a table.' },
          { term: '', meaning: 'thieu term' },
          { term: 'thieu meaning' },
        ],
        phrases: [{ en: 'Table for two, please.', vi: 'Ban cho hai nguoi.' }, { vi: 'thieu en' }],
        dialogue: [{ en: 'Hi there!', vi: 'Chao!' }],
        passage: 'khong phai mang',
      },
      'nha hang',
    );
    expect(pack.topic).toBe('nha hang');
    expect(pack.vocab).toHaveLength(1);
    expect(pack.phrases).toHaveLength(1);
    expect(pack.dialogue[0].speaker).toBe('A'); // speaker mac dinh
    expect(pack.passage).toEqual([]);
  });
});
