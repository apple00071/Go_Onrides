-- Enable postgres role for DDL operations
SET ROLE postgres;

-- Update profiles table schema
DO $$ 
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at') THEN
        ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_by') THEN
        ALTER TABLE public.profiles ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'permissions') THEN
        ALTER TABLE public.profiles ADD COLUMN permissions JSONB DEFAULT '{
            "can_create_bookings": true,
            "can_view_bookings": true,
            "can_edit_bookings": false,
            "can_delete_bookings": false,
            "can_manage_users": false,
            "can_view_reports": false
        }'::jsonb;
    END IF;

    -- Ensure the id column is UUID and primary key
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'id' 
        AND data_type = 'uuid'
    ) THEN
        -- If profiles table doesn't exist, create it
        CREATE TABLE IF NOT EXISTS public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id),
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_by UUID REFERENCES auth.users(id),
            permissions JSONB DEFAULT '{
                "can_create_bookings": true,
                "can_view_bookings": true,
                "can_edit_bookings": false,
                "can_delete_bookings": false,
                "can_manage_users": false,
                "can_view_reports": false
            }'::jsonb
        );
    END IF;
END $$;

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Update existing records with default permissions
UPDATE public.profiles
SET permissions = CASE 
    WHEN role = 'admin' THEN '{
        "can_create_bookings": true,
        "can_view_bookings": true,
        "can_edit_bookings": true,
        "can_delete_bookings": true,
        "can_manage_users": true,
        "can_view_reports": true
    }'::jsonb
    ELSE '{
        "can_create_bookings": true,
        "can_view_bookings": true,
        "can_edit_bookings": false,
        "can_delete_bookings": false,
        "can_manage_users": false,
        "can_view_reports": false
    }'::jsonb
END
WHERE permissions IS NULL;

-- Grant necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profiles TO postgres;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role has full access" ON public.profiles;

-- Create RLS policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        auth.uid() = id
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can insert profiles"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can update profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Allow service role full access
CREATE POLICY "Service role has full access"
    ON public.profiles
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Reset role
RESET ROLE; 