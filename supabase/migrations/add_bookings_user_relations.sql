-- Drop existing constraints if they exist
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS bookings_created_by_fkey,
DROP CONSTRAINT IF EXISTS bookings_updated_by_fkey;

-- Add foreign key relationships between bookings and profiles tables
ALTER TABLE bookings
ADD CONSTRAINT bookings_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES profiles(id)
ON DELETE SET NULL;

ALTER TABLE bookings
ADD CONSTRAINT bookings_updated_by_fkey
FOREIGN KEY (updated_by)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_created_by ON bookings(created_by);
CREATE INDEX IF NOT EXISTS idx_bookings_updated_by ON bookings(updated_by); 