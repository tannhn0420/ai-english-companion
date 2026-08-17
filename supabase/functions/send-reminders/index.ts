// ============================================
// Edge Function: gửi nhắc ôn (Phase 8). Chạy theo cron mỗi giờ.
// Tính số thẻ đến hạn / user từ bảng `cards` (đã sync), gửi Web Push cho
// subscription nào đang đúng "giờ địa phương" đã đặt và có đủ thẻ đến hạn.
//
// Deploy: supabase functions deploy send-reminders --no-verify-jwt
// Secrets cần đặt: VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT (mailto:...)
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY có sẵn trong môi trường function)
// ============================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const THRESHOLD = 5; // chỉ nhắc khi có >= 5 thẻ đến hạn

Deno.serve(async () => {
  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com',
    Deno.env.get('VAPID_PUBLIC')!,
    Deno.env.get('VAPID_PRIVATE')!,
  );

  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const utcHour = new Date().getUTCHours();

  // Đếm thẻ đến hạn theo user (payload.due <= now, chưa xóa)
  const { data: cards } = await supa
    .from('cards')
    .select('user_id, payload, deleted')
    .eq('deleted', false);
  const due = new Map<string, number>();
  for (const c of cards ?? []) {
    const d = Number((c.payload as { due?: number })?.due ?? 0);
    if (d && d <= now) due.set(c.user_id, (due.get(c.user_id) ?? 0) + 1);
  }

  const { data: subs } = await supa.from('push_subscriptions').select('*');
  let sent = 0;
  for (const s of subs ?? []) {
    const n = due.get(s.user_id) ?? 0;
    if (n < THRESHOLD) continue;
    if (s.last_sent === today) continue;
    // Giờ địa phương = giờ UTC - tz_offset/60 (getTimezoneOffset âm khi ở phía đông)
    const localHour = ((utcHour - s.tz_offset / 60) % 24 + 24) % 24;
    if (Math.floor(localHour) !== s.reminder_hour) continue;

    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({
          title: 'Ôn từ nào! 🔥',
          body: `Bạn có ${n} từ đến hạn ôn hôm nay.`,
          url: '/review',
        }),
      );
      await supa.from('push_subscriptions').update({ last_sent: today }).eq('endpoint', s.endpoint);
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        await supa.from('push_subscriptions').delete().eq('endpoint', s.endpoint); // hết hạn
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
