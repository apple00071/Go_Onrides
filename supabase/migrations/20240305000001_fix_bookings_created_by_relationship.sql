-- Drop existing foreign key if it exists
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS bookings_created_by_fkey CASCADE;

-- Add the correct foreign key constraint
ALTER TABLE bookings
ADD CONSTRAINT bookings_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_created_by
ON bookings(created_by); 