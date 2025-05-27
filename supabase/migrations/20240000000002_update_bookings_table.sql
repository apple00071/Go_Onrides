-- Add booking_id column if it doesn't exist
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS booking_id TEXT;

-- Add created_at column if it doesn't exist
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Add status column if it doesn't exist
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed'
CHECK (status IN ('pending', 'confirmed', 'in_use', 'completed', 'cancelled'));

-- Add constraint to ensure booking_id follows the GNXYY format
ALTER TABLE bookings
ADD CONSTRAINT booking_id_format_check 
CHECK (booking_id ~ '^GN\d+\d{2}$');

-- Update existing bookings without booking_id
UPDATE bookings
SET booking_id = 'BK' || EXTRACT(EPOCH FROM created_at)::TEXT
WHERE booking_id IS NULL;

-- Make booking_id unique and not null
ALTER TABLE bookings
ALTER COLUMN booking_id SET NOT NULL,
ADD CONSTRAINT bookings_booking_id_unique UNIQUE (booking_id);

-- Add index on booking_id for faster lookups
CREATE INDEX IF NOT EXISTS bookings_booking_id_idx ON bookings (booking_id);

-- Add index on status for faster filtering
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status);

-- Add index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS bookings_created_at_idx ON bookings (created_at); 