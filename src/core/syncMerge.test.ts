import { describe, expect, it } from 'vitest';
import { createCard } from './srs';
import {
  mergeDays,
  mergeFreeze,
  mergeWeak,
  resolveRemote,
  statsFromDays,
  type RemoteCard,
} from './syncMerge';

const NOW = 1_750_000_000_000;
const card = (updatedAt?: number) => ({
  ...createCard({ term: 'hello', meaning: 'xin chao', lang: 'en' }, NOW),
  id: 'c1',
  updatedAt,
});

const remote = (updated_at: number, deleted = false): RemoteCard => ({
  id: 'c1',
  payload: { ...card(updated_at), meaning: 'phien ban remote' },
  updated_at,
  deleted,
});

describe('resolveRemote (LWW)', () => {
  it('remote moi hon -> apply-remote', () => {
    const a = resolveRemote(card(NOW), remote(NOW + 1000));
    expect(a.kind).toBe('apply-remote');
  });

  it('local moi hon -> keep-local (ke ca khi remote la tombstone)', () => {
    expect(resolveRemote(card(NOW + 2000), remote(NOW)).kind).toBe('keep-local');
    expect(resolveRemote(card(NOW + 2000), remote(NOW, true)).kind).toBe('keep-local');
  });

  it('tombstone moi hon -> delete-local; chua co local -> keep', () => {
    expect(resolveRemote(card(NOW), remote(NOW + 1, true)).kind).toBe('delete-local');
    expect(resolveRemote(undefined, remote(NOW, true)).kind).toBe('keep-local');
  });

  it('thieu updatedAt -> fallback createdAt', () => {
    expect(resolveRemote(card(undefined), remote(NOW + 1)).kind).toBe('apply-remote');
  });
});

describe('merge max-wise (idempotent qua nhieu vong sync)', () => {
  it('mergeDays lay max tung ngay; stats dan xuat lai tu days', () => {
    const a = { '2026-08-12': { attempts: 5, sumScore: 4 } };
    const b = {
      '2026-08-12': { attempts: 3, sumScore: 5 },
      '2026-08-13': { attempts: 2, sumScore: 2 },
    };
    const m = mergeDays(a, b);
    expect(m['2026-08-12']).toEqual({ attempts: 5, sumScore: 5 });
    expect(m['2026-08-13']).toEqual({ attempts: 2, sumScore: 2 });
    // merge lai lan nua khong doi (idempotent)
    expect(mergeDays(m, b)).toEqual(m);
    expect(statsFromDays(m)).toEqual({ attempts: 7, sumScore: 7 });
  });

  it('mergeWeak max tung tu; mergeFreeze lay ngay gan nhat', () => {
    const m = mergeWeak(
      { walk: { misses: 2, attempts: 5 } },
      { walk: { misses: 1, attempts: 7 }, run: { misses: 1, attempts: 1 } },
    );
    expect(m.walk).toEqual({ misses: 2, attempts: 7 });
    expect(m.run).toEqual({ misses: 1, attempts: 1 });
    expect(mergeFreeze('2026-08-10', '2026-08-12')).toBe('2026-08-12');
    expect(mergeFreeze(undefined, '2026-08-12')).toBe('2026-08-12');
    expect(mergeFreeze(undefined, undefined)).toBeUndefined();
  });
});
