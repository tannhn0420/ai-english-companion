-- ============================================
-- AI English Companion — schema sync (Phase 8 / M1.5)
-- Chạy MỘT LẦN trong Supabase Dashboard → SQL Editor → New query → Run.
-- Thiết kế: payload jsonb giữ nguyên 100% shape VocabCard (D8);
-- last-write-wins theo updated_at (ms epoch từ client); xóa = tombstone.
-- ============================================

create table if not exists public.cards (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  payload jsonb not null,
  updated_at bigint not null,
  deleted boolean not null default false,
  primary key (user_id, id)
);

create index if not exists cards_user_updated on public.cards (user_id, updated_at);

alter table public.cards enable row level security;

drop policy if exists "own cards" on public.cards;
create policy "own cards" on public.cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.meta (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at bigint not null,
  primary key (user_id, key)
);

alter table public.meta enable row level security;

drop policy if exists "own meta" on public.meta;
create policy "own meta" on public.meta
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
