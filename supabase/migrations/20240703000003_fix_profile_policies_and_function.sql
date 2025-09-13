-- Fix profile policies with better error handling
SET ROLE postgres;

-- First, temporarily disable RLS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies using dynamic SQL to avoid errors
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- Create a more robust admin check function
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _is_admin boolean;
BEGIN
    -- Default to false if no session
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    -- Direct query without recursion
    SELECT (role = 'admin')
    INTO _is_admin
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1;

    -- Return false if no profile found
    RETURN COALESCE(_is_admin, false);
END;
$$;

-- Create simplified, non-recursive policies
CREATE POLICY "profiles_select_policy"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        -- Users can always read their own profile
        id = auth.uid()
        OR
        -- Admins can read all profiles (using security definer function)
        check_is_admin()
    );

CREATE POLICY "profiles_insert_policy"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Allow users to create their own profile during signup
        id = auth.uid()
        OR
        -- Allow admins to create profiles for others
        check_is_admin()
    );

CREATE POLICY "profiles_update_policy"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        -- Users can update their own profile
        id = auth.uid()
        OR
        -- Admins can update any profile
        check_is_admin()
    );

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.check_is_admin TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role; 