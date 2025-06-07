-- Drop existing foreign key constraints if they exist
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS bookings_created_by_fkey CASCADE,
DROP CONSTRAINT IF EXISTS bookings_updated_by_fkey CASCADE;

-- Ensure the created_by and updated_by columns exist and are of type UUID
ALTER TABLE bookings
ALTER COLUMN created_by TYPE UUID USING created_by::UUID,
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Add foreign key constraints with proper references to profiles table
ALTER TABLE bookings
ADD CONSTRAINT bookings_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES profiles(id)
ON DELETE SET NULL,
ADD CONSTRAINT bookings_updated_by_fkey
FOREIGN KEY (updated_by)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_created_by ON bookings(created_by);
CREATE INDEX IF NOT EXISTS idx_bookings_updated_by ON bookings(updated_by);

-- Enable Row Level Security (RLS) on bookings table if not already enabled
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create or replace policies for bookings table
CREATE POLICY "Allow users to view bookings"
ON bookings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND (
      profiles.role = 'admin' OR
      (profiles.permissions->>'viewBookings')::boolean = true
    )
  )
);

-- Add comment for documentation
COMMENT ON CONSTRAINT bookings_created_by_fkey ON bookings IS 'References the profile that created the booking';
COMMENT ON CONSTRAINT bookings_updated_by_fkey ON bookings IS 'References the profile that last updated the booking'; 