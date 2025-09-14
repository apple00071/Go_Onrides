import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function getSession() {
  const supabase = createServerComponentClient<Database>({ cookies });
  return await supabase.auth.getSession();
}

export async function getUser() {
  const supabase = createServerComponentClient<Database>({ cookies });
  return await supabase.auth.getUser();
}

export async function signOut() {
  const supabase = createServerComponentClient<Database>({ cookies });
  return await supabase.auth.signOut();
}

export async function getSupabaseServerClient() {
  return createServerComponentClient<Database>({ cookies });
}
