-- Add aadhar_number column to bookings table
ALTER TABLE bookings ADD COLUMN aadhar_number TEXT;

-- Update existing rows to have a default value (optional)
-- UPDATE bookings SET aadhar_number = '' WHERE aadhar_number IS NULL;

-- Make the column required for future entries
ALTER TABLE bookings ALTER COLUMN aadhar_number SET NOT NULL; 