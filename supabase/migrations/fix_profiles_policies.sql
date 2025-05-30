-- First, temporarily disable RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
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

-- Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
STABLE
LANGUAGE plpgsql
AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    SELECT (role = 'admin')::boolean INTO is_admin
    FROM profiles
    WHERE id = user_id
    LIMIT 1;
    
    RETURN COALESCE(is_admin, false);
END;
$$;

-- Create simple policies
-- Allow users to read their own profile and admins to read all profiles
CREATE POLICY "profiles_select_policy"
ON profiles FOR SELECT
TO authenticated
USING (
    id = auth.uid() OR  -- User can always see their own profile
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Allow profile creation during signup and by admins
CREATE POLICY "profiles_insert_policy"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
    -- Allow users to create their own profile
    auth.uid() = id
    OR
    -- Allow admins to create profiles for others
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Allow users to update their own profile and admins to update any profile
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

-- Allow only admins to delete profiles (but not their own)
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

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;

-- Create a trigger function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Set role to rls_restricted to bypass RLS for initial profile creation
    SET LOCAL role = 'rls_restricted';
    
    INSERT INTO public.profiles (id, email, role, permissions)
    VALUES (
        new.id,
        new.email,
        'worker',
        jsonb_build_object(
            'createBooking', false,
            'viewBookings', true,
            'uploadDocuments', false,
            'viewDocuments', true,
            'managePayments', false,
            'accessReports', false
        )
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user(); 