import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/database';

// Use a singleton pattern to ensure only one client instance is created
let supabase: ReturnType<typeof createClientComponentClient<Database>> | null = null;

export const getSupabaseClient = () => {
  if (!supabase) {
    supabase = createClientComponentClient<Database>();
  }
  return supabase;
}; 