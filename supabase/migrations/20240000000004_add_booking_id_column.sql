-- Add booking_id column to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS booking_id TEXT DEFAULT 'GN124';

-- Set default value for any existing NULL booking_ids
UPDATE bookings SET booking_id = 'GN124' WHERE booking_id IS NULL;

-- Add constraint to ensure booking_id follows the GNXYY format
ALTER TABLE bookings
ADD CONSTRAINT booking_id_format_check 
CHECK (booking_id ~ '^GN\d+\d{2}$');

-- Make booking_id unique and not null
ALTER TABLE bookings
ALTER COLUMN booking_id SET NOT NULL;

-- Add unique constraint
ALTER TABLE bookings
ADD CONSTRAINT bookings_booking_id_unique UNIQUE (booking_id);

-- Remove the default value after ensuring all rows have a value
ALTER TABLE bookings ALTER COLUMN booking_id DROP DEFAULT;

-- Add index on booking_id for faster lookups
CREATE INDEX IF NOT EXISTS bookings_booking_id_idx ON bookings (booking_id); 