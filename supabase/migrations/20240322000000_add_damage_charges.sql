-- Add damage_charges column to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS damage_charges DECIMAL(10,2) DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_damage_charges ON bookings(damage_charges);

-- Add comment for documentation
COMMENT ON COLUMN bookings.damage_charges IS 'Amount charged for any damages to the vehicle during the rental period'; 