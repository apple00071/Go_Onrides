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
VALUES ('customer-documents', 'customer-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies with service role
DO $$
BEGIN
  -- Policy to allow authenticated users to upload files with size and type restrictions
  EXECUTE format('
    CREATE POLICY "Allow authenticated users to upload files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = ''customer-documents'' AND
      auth.role() = ''authenticated'' AND
      (octet_length(file) <= 10485760) AND -- 10MB max file size
      (mime_type = ANY (ARRAY[''application/pdf'', ''image/jpeg'', ''image/png''])) AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND (role = ''admin'' OR permissions->''uploadDocuments'' = ''true'')
      )
    )
  ');

  -- Policy to allow authenticated users to read files
  EXECUTE format('
    CREATE POLICY "Allow authenticated users to read files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
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
      auth.role() = ''authenticated'' AND
      owner = auth.uid()
    )
    WITH CHECK (
      bucket_id = ''customer-documents'' AND
      auth.role() = ''authenticated'' AND
      owner = auth.uid() AND
      (octet_length(file) <= 10485760) AND -- 10MB max file size
      (mime_type = ANY (ARRAY[''application/pdf'', ''image/jpeg'', ''image/png'']))
    )
  ');

  -- Policy to allow authenticated users to delete their own files
  EXECUTE format('
    CREATE POLICY "Allow authenticated users to delete their own files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = ''customer-documents'' AND
      auth.role() = ''authenticated'' AND
      owner = auth.uid()
    )
  ');
END $$; 