-- Add uploaded_documents column to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS uploaded_documents JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN bookings.uploaded_documents IS 'JSON containing uploaded document URLs';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_uploaded_documents ON bookings USING gin(uploaded_documents); 