import { describe, expect, it } from 'vitest';
import { gradeSentence } from './dictation';
import { fromDictation, toClozeCard } from './mistakes';

const NOW = 1_750_000_000_000;

describe('fromDictation', () => {
  it('moi tu sai/thieu (>=3 ky tu) thanh 1 Mistake, cau goc lam corrected', () => {
    const diff = gradeSentence('The mayor investigated the decline', 'The mayor investigate the decline');
    const ms = fromDictation(diff, 'The mayor investigated the decline', NOW);
    expect(ms).toHaveLength(1);
    expect(ms[0]).toMatchObject({
      source: 'dictation',
      errorSpan: 'investigated',
      corrected: 'The mayor investigated the decline',
      type: 'listening',
      due: NOW,
    });
  });

  it('bo qua tu chuc nang ngan < 3 ky tu (to/on)', () => {
    const diff = gradeSentence('I go to work', 'I go on work');
    // "to" -> wrong nhung 2 ky tu -> khong tao mistake
    expect(fromDictation(diff, 'I go to work', NOW)).toHaveLength(0);
  });
});

describe('toClozeCard', () => {
  it('duc lo dung cho tu sai trong cau dung', () => {
    const cloze = toClozeCard({
      id: 'm1',
      source: 'dictation',
      original: 'x',
      corrected: 'The mayor investigated the decline',
      errorSpan: 'investigated',
      createdAt: NOW,
    });
    expect(cloze).not.toBeNull();
    expect(cloze!.before).toBe('The mayor ');
    expect(cloze!.blank).toBe('investigated');
    expect(cloze!.after).toBe(' the decline');
  });

  it('khong tim thay span -> null', () => {
    expect(
      toClozeCard({
        id: 'm2',
        source: 'writing',
        original: 'x',
        corrected: 'hello world',
        errorSpan: 'zzz',
        createdAt: NOW,
      }),
    ).toBeNull();
  });
});
