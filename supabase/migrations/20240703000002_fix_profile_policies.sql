-- Fix recursive profile policies
SET ROLE postgres;

-- Temporarily disable RLS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role has full access" ON public.profiles;

-- Create a function to check admin status without recursion
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = user_id 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new non-recursive policies
CREATE POLICY "Allow users to view own profile and admins to view all"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        -- Users can always view their own profile
        id = auth.uid() 
        OR 
        -- Admins can view all profiles (using direct query instead of recursive check)
        (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Allow admins to insert profiles"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Only admins can insert new profiles (using direct query)
        (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Allow users to update own profile and admins to update all"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        -- Users can update their own profile
        id = auth.uid() 
        OR 
        -- Admins can update any profile (using direct query)
        (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid())
    );

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_admin_user TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role; 