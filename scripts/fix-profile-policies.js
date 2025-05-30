import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dohiiawnnantusgsddzw.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixProfilePolicies() {
  try {
    console.log('Starting profile policies fix...');

    // First disable RLS to allow policy changes
    const disableRls = `
      ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
    `;

    // Drop existing policies
    const dropPolicies = `
      DO $$ 
      DECLARE 
          pol RECORD;
      BEGIN
          FOR pol IN SELECT policyname 
                     FROM pg_policies 
                     WHERE tablename = 'profiles' 
          LOOP
              EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
          END LOOP;
      END $$;
    `;

    // Create new policies
    const createPolicies = `
      -- Enable RLS
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

      -- Allow users to read their own profile
      CREATE POLICY "profiles_select_own"
      ON profiles FOR SELECT
      TO authenticated
      USING (
          auth.uid() = id
      );

      -- Allow users to update their own profile
      CREATE POLICY "profiles_update_own"
      ON profiles FOR UPDATE
      TO authenticated
      USING (
          auth.uid() = id
      );

      -- Allow system to create profiles
      CREATE POLICY "profiles_insert_system"
      ON profiles FOR INSERT
      TO authenticated
      WITH CHECK (
          auth.uid() = id
      );
    `;

    // Execute the SQL statements
    console.log('Disabling RLS...');
    const { error: disableError } = await supabase.rpc('exec_sql', { sql: disableRls });
    if (disableError) throw disableError;

    console.log('Dropping existing policies...');
    const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropPolicies });
    if (dropError) throw dropError;

    console.log('Creating new policies...');
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createPolicies });
    if (createError) throw createError;

    // Verify the changes
    console.log('Verifying changes...');
    const { data: policies, error: verifyError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'profiles');

    if (verifyError) throw verifyError;

    console.log('Current policies:', policies);
    console.log('Profile policies updated successfully!');
  } catch (error) {
    console.error('Error fixing profile policies:', error);
    process.exit(1);
  }
}

fixProfilePolicies(); 