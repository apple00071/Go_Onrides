import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Use a singleton pattern to ensure only one client instance is created
let supabase: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = () => {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseClient should only be called on the client side');
  }
  
  if (!supabase) {
    supabase = createClient();
  }
  return supabase;
};
