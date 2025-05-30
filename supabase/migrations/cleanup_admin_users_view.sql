-- First, disable RLS temporarily to avoid permission issues
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop any triggers that might reference the materialized view
DROP TRIGGER IF EXISTS refresh_admin_users_trigger ON profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the functions
DROP FUNCTION IF EXISTS refresh_admin_users();
DROP FUNCTION IF EXISTS handle_new_user();

-- Drop the materialized view
DROP MATERIALIZED VIEW IF EXISTS admin_users;

-- Drop any indexes on the materialized view (just in case)
DROP INDEX IF EXISTS admin_users_id_idx;

-- Drop any existing policies
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

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY; 