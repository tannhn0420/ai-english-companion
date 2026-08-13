// ============================================
// Supabase client — lazy-load (dynamic import) để giữ initial bundle
// dưới budget (ARCHITECTURE §11). Publishable key là public theo thiết kế;
// dữ liệu được bảo vệ bằng RLS (supabase/schema.sql).
// ============================================

import type { Session, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gfxdxzeaettwntlwidbs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Sii29K9l3Yj_eJIHFqPBYQ_op8R8t8y';

let clientP: Promise<SupabaseClient> | undefined;

export function getClient(): Promise<SupabaseClient> {
  clientP ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_KEY),
  );
  return clientP;
}

export async function getSession(): Promise<Session | null> {
  const client = await getClient();
  const { data } = await client.auth.getSession();
  return data.session;
}

export async function signIn(email: string, password: string): Promise<string | null> {
  const client = await getClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  return error ? error.message : null;
}

export async function signUp(email: string, password: string): Promise<string | null> {
  const client = await getClient();
  const { error } = await client.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin },
  });
  return error ? error.message : null;
}

export async function signOut(): Promise<void> {
  const client = await getClient();
  await client.auth.signOut();
}
