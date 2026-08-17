import { describe, expect, it } from 'vitest';
import { gradeSentence } from './dictation';
import { fromDictation, fromProofread, toClozeCard } from './mistakes';

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

describe('fromProofread', () => {
  it('moi issue -> Mistake source writing, giu note tieng Viet', () => {
    const ms = fromProofread(
      [
        { original: 'I have 25 years old', suggestion: 'I am 25 years old', why: 'Tuoi dung to be', type: 'grammar' },
        { original: 'recieve', suggestion: 'receive', why: 'i truoc e', type: 'spelling' },
      ],
      NOW,
    );
    expect(ms).toHaveLength(2);
    expect(ms[0]).toMatchObject({ source: 'writing', corrected: 'I am 25 years old', type: 'grammar', note: 'Tuoi dung to be' });
    expect(ms[1].type).toBe('spelling');
  });

  it('bo qua issue khong doi (suggestion == original)', () => {
    const ms = fromProofread([{ original: 'ok', suggestion: 'ok', why: '', type: 'style' }], NOW);
    expect(ms).toHaveLength(0);
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
