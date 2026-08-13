import { describe, expect, it } from 'vitest';
import { buildQuiz } from './quiz';
import { buildCloze, buildSentenceIndex, type SentenceDeps } from './cloze';
import { createCard } from './srs';
import type { VocabCard } from './types';

const NOW = 1_750_000_000_000;

function card(term: string, meaning: string, extra?: Partial<VocabCard>): VocabCard {
  return { ...createCard({ term, meaning, lang: 'en' }, NOW), id: term, ...extra };
}

const DECK = [
  card('walk', 'di bo'),
  card('run', 'chay'),
  card('read', 'doc'),
  card('write', 'viet'),
  card('sleep', 'ngu'),
];

/** rng tuan tu co dinh — test deterministic */
function seqRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('buildQuiz', () => {
  it('sinh du cau hoi, dap an dung nam trong options, khong trung lua chon', () => {
    const qs = buildQuiz(DECK, { size: 5, rng: seqRng([0.1, 0.3, 0.7, 0.2, 0.9, 0.4]) });
    expect(qs).toHaveLength(5);
    for (const q of qs) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options.length).toBeLessThanOrEqual(4);
      const correct = q.options[q.answer];
      if (q.dir === 'term2meaning') {
        expect(q.prompt).toBe(DECK.find((c) => c.id === q.cardId)!.term);
        expect(correct).toBe(DECK.find((c) => c.id === q.cardId)!.meaning);
      } else {
        expect(correct).toBe(DECK.find((c) => c.id === q.cardId)!.term);
      }
      expect(new Set(q.options.map((o) => o.toLowerCase())).size).toBe(q.options.length);
    }
  });

  it('deck < 4 the -> [] (khong du distractor)', () => {
    expect(buildQuiz(DECK.slice(0, 3))).toHaveLength(0);
  });

  it('loc theo topic', () => {
    const deck = [
      card('a1', 'x', { topic: 'work' }),
      card('a2', 'y', { topic: 'work' }),
      card('a3', 'z', { topic: 'work' }),
      card('a4', 'w', { topic: 'work' }),
      card('b1', 'k', { topic: 'travel' }),
    ];
    const qs = buildQuiz(deck, { topic: 'work', rng: seqRng([0.2]) });
    expect(qs.every((q) => q.cardId.startsWith('a'))).toBe(true);
  });
});

describe('buildCloze — uu tien context > tatoeba > example', () => {
  const pairs = [
    { id: 101, en: 'I walk to school every day.', vi: 'Toi di bo den truong moi ngay.' },
    { id: 102, en: 'She walked home.', vi: 'Co ay da di bo ve nha.' },
    { id: 103, en: 'They run fast.', vi: 'Ho chay nhanh.' },
  ];
  const words = { walk: 1, run: 1, school: 1, day: 1, home: 1, fast: 1 };
  const variants = { walked: 'walk', walks: 'walk', runs: 'run', ran: 'run' };
  const deps: SentenceDeps = {
    pairs,
    variants,
    index: buildSentenceIndex(pairs, variants, words),
  };

  it('co context ca nhan -> dung context, giu nguyen hoa thuong cua tu khop', () => {
    const q = buildCloze(card('walk', 'di bo', { context: 'Walking is nice, so I walk a lot.' }), deps);
    expect(q).not.toBeNull();
    expect(q!.source).toBe('context');
    expect(q!.blank.toLowerCase()).toBe('walk');
    expect(q!.before + q!.blank + q!.after).toBe('Walking is nice, so I walk a lot.');
  });

  it('khong context -> cau Tatoeba (uu tien cau ngan), co vi + id de attribution', () => {
    const q = buildCloze(card('run', 'chay'), deps);
    expect(q!.source).toBe('tatoeba');
    expect(q!.tatoebaId).toBe(103);
    expect(q!.vi).toBe('Ho chay nhanh.');
  });

  it('match ca bien the (walked) theo word-boundary', () => {
    const q = buildCloze(card('walk', 'di bo', { context: 'She walked away quietly here.' }), deps);
    expect(q!.blank).toBe('walked');
  });

  it('khong co nguon nao -> example; het nguon -> null', () => {
    const noDeps = buildCloze(card('sleep', 'ngu', { example: 'I sleep early.' }));
    expect(noDeps!.source).toBe('example');
    expect(buildCloze(card('xylophone', 'dan phim'), deps)).toBeNull();
  });

  it('index khong nhan match trong tu khac (walk khong match walking neu khong khai bao)', () => {
    const q = buildCloze(card('walk', 'di bo', { context: 'Walking only, nothing else.' }), {
      pairs: [],
      variants: {},
      index: new Map(),
    });
    expect(q).toBeNull(); // 'walking' khong phai bien the da khai bao -> khong match
  });
});
