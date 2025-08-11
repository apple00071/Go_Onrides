-- Set the security context to the service role
SET SESSION ROLE service_role;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read files" ON storage.objects;

-- Create the customer-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-documents', 'customer-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Enable Row Level Security
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies with service role
DO $$
BEGIN
  -- Policy to allow authenticated users to upload files
  EXECUTE format('
    CREATE POLICY "Allow authenticated users to upload files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = ''customer-documents'' AND
      auth.role() = ''authenticated''
    )
  ');

  -- Policy to allow authenticated users to update their own files
  EXECUTE format('
    CREATE POLICY "Allow authenticated users to update their own files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = ''customer-documents'' AND
      auth.role() = ''authenticated''
    )
    WITH CHECK (
      bucket_id = ''customer-documents'' AND
      auth.role() = ''authenticated''
    )
  ');

  -- Policy to allow authenticated users to delete their own files
  EXECUTE format('
    CREATE POLICY "Allow authenticated users to delete their own files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = ''customer-documents'' AND
      auth.role() = ''authenticated''
    )
  ');

  -- Policy to allow public access to read files
  EXECUTE format('
    CREATE POLICY "Allow public to read files"
    ON storage.objects FOR SELECT
    TO public
    USING (
      bucket_id = ''customer-documents''
    )
  ');
END $$;

-- Grant necessary permissions to authenticated and anon roles
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO anon;

-- Reset session role
RESET ROLE; 