// ============================================
// Sync client — pull-then-push, LWW theo updatedAt (ARCHITECTURE §4.4).
// - Thẻ: bảng `cards` (payload jsonb giữ nguyên shape — D8), xóa = tombstone.
// - Dữ liệu học: bảng `meta`, merge max-wise (core/syncMerge) rồi đẩy bản gộp.
// - Chạy khi: mở app, sau mỗi phiên học/sửa deck (queueSync debounce), nút Sync.
// Lưu ý chấp nhận: LWW dựa đồng hồ client — đủ tốt cho dùng cá nhân (D2).
// ============================================

import type { PerDay } from '../core/gamification';
import { mergeDays, mergeFreeze, mergeWeak, resolveRemote, statsFromDays, cardStamp, type RemoteCard } from '../core/syncMerge';
import * as db from './db';
import { getClient, getSession } from './supabase';
import type { WeakWordMap } from './stats';

export interface SyncResult {
  status: 'ok' | 'signed-out' | 'error';
  pulled?: number;
  pushed?: number;
  message?: string;
}

const LS_KEY = 'aec-sync-state'; // { [userId]: { pulledAt, pushedAt, lastOkAt } }

interface SyncState {
  pulledAt: number;
  pushedAt: number;
  lastOkAt?: number;
}

function loadState(userId: string): SyncState {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    return all[userId] ?? { pulledAt: 0, pushedAt: 0 };
  } catch {
    return { pulledAt: 0, pushedAt: 0 };
  }
}

function saveState(userId: string, state: SyncState): void {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    all[userId] = state;
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function lastSyncedAt(userId: string): number | undefined {
  return loadState(userId).lastOkAt;
}

let running: Promise<SyncResult> | null = null;

/** Đồng bộ đầy đủ một vòng. Gọi chồng nhau sẽ dùng chung một lượt đang chạy. */
export function syncNow(): Promise<SyncResult> {
  running ??= doSync().finally(() => {
    running = null;
  });
  return running;
}

let queueTimer: ReturnType<typeof setTimeout> | undefined;

/** Sync nền sau mutation/phiên học — debounce 3s, nuốt lỗi (offline là bình thường). */
export function queueSync(): void {
  clearTimeout(queueTimer);
  queueTimer = setTimeout(() => {
    void syncNow().catch(() => {});
  }, 3000);
}

const META_KEYS = ['practiceDays', 'practiceStats', 'weakWords', 'streakFreeze'] as const;

async function doSync(): Promise<SyncResult> {
  const session = await getSession();
  if (!session) return { status: 'signed-out' };
  const userId = session.user.id;

  try {
    const client = await getClient();
    const state = loadState(userId);
    const now = Date.now();
    let pulled = 0;
    let pushed = 0;

    // ---- PULL cards (delta theo updated_at) ----
    const { data: remoteRows, error: pullErr } = await client
      .from('cards')
      .select('id,payload,updated_at,deleted')
      .gt('updated_at', state.pulledAt);
    if (pullErr) throw new Error(pullErr.message);

    const local = await db.getAllCards();
    const byId = new Map(local.map((c) => [c.id, c]));
    let maxPulled = state.pulledAt;

    for (const row of (remoteRows ?? []) as RemoteCard[]) {
      maxPulled = Math.max(maxPulled, row.updated_at);
      const action = resolveRemote(byId.get(row.id), row);
      if (action.kind === 'apply-remote') {
        await db.putCard(action.card);
        byId.set(row.id, action.card);
        pulled++;
      } else if (action.kind === 'delete-local') {
        await db.deleteCardRaw(row.id);
        byId.delete(row.id);
        pulled++;
      }
    }

    // ---- PULL + MERGE meta (dữ liệu học) ----
    const { data: remoteMeta, error: metaErr } = await client
      .from('meta')
      .select('key,value')
      .in('key', [...META_KEYS]);
    if (metaErr) throw new Error(metaErr.message);
    const rm = new Map((remoteMeta ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));

    const localDays = await db.getMeta<PerDay>('practiceDays', {});
    const localWeak = await db.getMeta<WeakWordMap>('weakWords', {});
    const localFreeze = await db.getMeta<{ lastUsed?: string }>('streakFreeze', {});

    const days = mergeDays(localDays, (rm.get('practiceDays') as PerDay) ?? {});
    const weak = mergeWeak(localWeak, (rm.get('weakWords') as WeakWordMap) ?? {});
    const freeze = {
      lastUsed: mergeFreeze(
        localFreeze.lastUsed,
        (rm.get('streakFreeze') as { lastUsed?: string } | undefined)?.lastUsed,
      ),
    };
    const stats = statsFromDays(days); // dẫn xuất lại — không double-count

    await db.setMeta('practiceDays', days);
    await db.setMeta('practiceStats', stats);
    await db.setMeta('weakWords', weak);
    await db.setMeta('streakFreeze', freeze);

    // ---- PUSH cards thay đổi cục bộ ----
    const dirty = [...byId.values()].filter((c) => cardStamp(c) > state.pushedAt);
    if (dirty.length) {
      const { error } = await client.from('cards').upsert(
        dirty.map((c) => ({
          user_id: userId,
          id: c.id,
          payload: c as unknown as Record<string, unknown>,
          updated_at: cardStamp(c),
          deleted: false,
        })),
      );
      if (error) throw new Error(error.message);
      pushed += dirty.length;
    }

    // ---- PUSH tombstones (thẻ đã xóa cục bộ) ----
    const tombstones = await db.getMeta<Record<string, number>>('tombstones', {});
    const tombIds = Object.keys(tombstones);
    if (tombIds.length) {
      const { error } = await client.from('cards').upsert(
        tombIds.map((id) => ({
          user_id: userId,
          id,
          payload: {},
          updated_at: tombstones[id],
          deleted: true,
        })),
      );
      if (error) throw new Error(error.message);
      pushed += tombIds.length;
      await db.setMeta('tombstones', {}); // đã lên server — server giữ tombstone vĩnh viễn
    }

    // ---- PUSH meta bản đã merge ----
    const { error: pushMetaErr } = await client.from('meta').upsert(
      [
        { key: 'practiceDays', value: days },
        { key: 'practiceStats', value: stats },
        { key: 'weakWords', value: weak },
        { key: 'streakFreeze', value: freeze },
      ].map((r) => ({ user_id: userId, ...r, updated_at: now })),
    );
    if (pushMetaErr) throw new Error(pushMetaErr.message);

    saveState(userId, { pulledAt: maxPulled, pushedAt: now, lastOkAt: now });
    return { status: 'ok', pulled, pushed };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}
