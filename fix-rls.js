import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRls() {
  try {
    // Disable RLS
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;'
    });

    // Check if the profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', '4cc2784a-a397-47de-8197-1544ac2f471a')
      .single();

    if (profileError) {
      console.error('Error checking profile:', profileError);
      return;
    }

    console.log('Profile:', profile);

    // Re-enable RLS
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;'
    });

    // Create RLS policies
    await supabase.rpc('exec_sql', {
      sql: `
        -- Drop existing policies
        DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
        DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
        DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
        DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

        -- Create new policies
        CREATE POLICY "profiles_select_policy"
        ON profiles FOR SELECT
        TO authenticated
        USING (
          id = auth.uid() OR  -- User can see their own profile
          EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        );

        CREATE POLICY "profiles_insert_policy"
        ON profiles FOR INSERT
        TO authenticated
        WITH CHECK (
          auth.uid() = id OR  -- User can create their own profile
          EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        );

        CREATE POLICY "profiles_update_policy"
        ON profiles FOR UPDATE
        TO authenticated
        USING (
          id = auth.uid() OR  -- User can update their own profile
          EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        );

        CREATE POLICY "profiles_delete_policy"
        ON profiles FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
          ) AND
          id != auth.uid()  -- Cannot delete own profile
        );
      `
    });

    console.log('RLS policies updated successfully');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixRls(); 