import { describe, expect, it } from 'vitest';
import {
  gradeSentence,
  isPerfect,
  normWord,
  scoreOf,
  wordTapChoices,
  wrongWords,
} from './dictation';

describe('gradeSentence', () => {
  it('cau dung hoan toan (bo qua hoa thuong + dau cau)', () => {
    const d = gradeSentence('I walk to school.', 'i walk to school');
    expect(d.every((x) => x.kind === 'ok')).toBe(true);
    expect(isPerfect(d)).toBe(true);
    expect(scoreOf(d)).toBe(100);
  });

  it('sai mot tu -> wrong (giu ca expected lan got)', () => {
    const d = gradeSentence('I walk to school', 'I walked to school');
    const wrong = d.find((x) => x.kind === 'wrong');
    expect(wrong).toEqual({ kind: 'wrong', expected: 'walk', got: 'walked' });
    expect(wrongWords(d)).toEqual(['walk']);
  });

  it('thieu tu -> missing', () => {
    const d = gradeSentence('I walk to school every day', 'I walk to school');
    expect(d.filter((x) => x.kind === 'missing').map((x) => x.expected)).toEqual(['every', 'day']);
    expect(isPerfect(d)).toBe(false);
    expect(scoreOf(d)).toBe(Math.round((100 * 4) / 6));
  });

  it('go thua tu -> extra (khong tinh vao mau so)', () => {
    const d = gradeSentence('I walk', 'I really walk');
    expect(d.find((x) => x.kind === 'extra')).toEqual({ kind: 'extra', got: 'really' });
    expect(scoreOf(d)).toBe(100); // 2/2 tu goc dung
  });

  it('input rong -> tat ca missing, diem 0', () => {
    const d = gradeSentence('hello world', '');
    expect(d).toHaveLength(2);
    expect(scoreOf(d)).toBe(0);
  });

  it('normWord bo dau cau va chuan hoa dau nhay', () => {
    expect(normWord('"School,"')).toBe('school');
    expect(normWord('don’t')).toBe("don't");
  });
});

describe('wordTapChoices', () => {
  it('giu du cac tu (deterministic voi rng co dinh)', () => {
    const seq = [0.1, 0.9, 0.3, 0.5];
    let i = 0;
    const choices = wordTapChoices('one two three four', () => seq[i++ % seq.length]);
    expect([...choices].sort()).toEqual(['four', 'one', 'three', 'two']);
    expect(choices).toHaveLength(4);
  });
});
