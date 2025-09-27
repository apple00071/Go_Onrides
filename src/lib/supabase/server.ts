import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
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

// Create a server-side client with service role for API routes that need to query data
export function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
