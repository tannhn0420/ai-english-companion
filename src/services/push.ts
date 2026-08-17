// ============================================
// Web Push (Phase 8) — đăng ký subscription + lưu vào Supabase; Edge Function
// cron gửi "N từ đến hạn" (supabase/functions/send-reminders). VAPID public key
// lấy từ env build VITE_VAPID_PUBLIC_KEY (đặt trong Cloudflare build env).
// ============================================

import { getClient, getSession } from './supabase';

export const VAPID_PUBLIC_KEY: string = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function pushConfigured(): boolean {
  return VAPID_PUBLIC_KEY.length > 0;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  return (await reg.pushManager.getSubscription()) !== null;
}

export type EnableResult = 'ok' | 'unsupported' | 'no-vapid' | 'signed-out' | 'denied' | 'error';

/** Xin quyền + đăng ký push + lưu subscription (kèm giờ nhắc + lệch múi giờ). */
export async function enablePush(reminderHour: number): Promise<EnableResult> {
  if (!pushSupported()) return 'unsupported';
  if (!pushConfigured()) return 'no-vapid';
  const session = await getSession();
  if (!session) return 'signed-out';

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    const json = sub.toJSON();
    const client = await getClient();
    const { error } = await client.from('push_subscriptions').upsert(
      {
        user_id: session.user.id,
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        reminder_hour: reminderHour,
        tz_offset: new Date().getTimezoneOffset(),
      },
      { onConflict: 'endpoint' },
    );
    return error ? 'error' : 'ok';
  } catch {
    return 'error';
  }
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  try {
    const client = await getClient();
    await client.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  } catch {
    /* ignore */
  }
  await sub.unsubscribe();
}
