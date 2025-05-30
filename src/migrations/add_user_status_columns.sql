-- Add columns for user status
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS disabled_at timestamptz DEFAULT null;

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_is_active ON auth.users(is_active);

-- Add a function to handle user deletion
CREATE OR REPLACE FUNCTION handle_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE auth.users
    SET is_active = false,
        disabled_at = NOW()
    WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically handle user deletion
DROP TRIGGER IF EXISTS soft_delete_user ON public.profiles;
CREATE TRIGGER soft_delete_user
    AFTER DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_soft_delete(); 