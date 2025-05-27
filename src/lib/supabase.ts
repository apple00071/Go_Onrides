import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

// Use a singleton pattern to ensure only one client instance is created
let supabase: ReturnType<typeof createBrowserClient<Database>> | null = null;

export const getSupabaseClient = () => {
  if (!supabase) {
    supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabase;
}; 