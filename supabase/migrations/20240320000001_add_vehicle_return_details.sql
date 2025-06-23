-- Drop existing enum type if it exists
DROP TYPE IF EXISTS fuel_level_type CASCADE;

-- Create an enum type for fuel level
CREATE TYPE fuel_level_type AS ENUM ('full', '3/4', '1/2', '1/4', 'empty');

-- Add vehicle return details columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS odometer_reading VARCHAR(255),
ADD COLUMN IF NOT EXISTS fuel_level fuel_level_type,
ADD COLUMN IF NOT EXISTS vehicle_remarks TEXT,
ADD COLUMN IF NOT EXISTS inspection_notes TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN bookings.odometer_reading IS 'The odometer reading when vehicle is returned';
COMMENT ON COLUMN bookings.fuel_level IS 'The fuel level when vehicle is returned (full, 3/4, 1/2, 1/4, empty)';
COMMENT ON COLUMN bookings.vehicle_remarks IS 'Any remarks about the vehicle condition upon return';
COMMENT ON COLUMN bookings.inspection_notes IS 'Notes from the vehicle inspection upon return';

-- Make fuel_level nullable
ALTER TABLE bookings 
ALTER COLUMN fuel_level DROP NOT NULL; 