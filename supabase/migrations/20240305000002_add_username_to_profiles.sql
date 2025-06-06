-- Add username column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT;

-- Create a unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON profiles(username);

-- Add not null constraint after creating the column
ALTER TABLE profiles
ALTER COLUMN username SET NOT NULL;

-- Add a trigger to ensure username is always set
CREATE OR REPLACE FUNCTION ensure_username()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS NULL THEN
    -- Default to first part of email if username not provided
    NEW.username := SPLIT_PART(NEW.email, '@', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_username_trigger ON profiles;
CREATE TRIGGER ensure_username_trigger
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION ensure_username(); 