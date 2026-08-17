-- ============================================
-- Web Push subscriptions (Phase 8). Chạy trong Supabase SQL Editor sau schema.sql.
-- Edge Function (service role) đọc bảng này + bảng cards để gửi nhắc ôn.
-- ============================================

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  reminder_hour int not null default 20,  -- giờ địa phương muốn nhận (0–23)
  tz_offset int not null default 0,       -- Date.getTimezoneOffset() (phút; VN = -420)
  last_sent date,                          -- chống gửi trùng trong ngày
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Chủ sở hữu quản lý subscription của mình; Edge Function dùng service role (bỏ qua RLS).
drop policy if exists "own push subs" on public.push_subscriptions;
create policy "own push subs" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
