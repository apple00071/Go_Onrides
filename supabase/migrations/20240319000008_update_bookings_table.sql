-- Drop existing columns that will be replaced
ALTER TABLE bookings
DROP COLUMN IF EXISTS identification;

-- Add new individual columns
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS aadhar_number TEXT,
ADD COLUMN IF NOT EXISTS dl_number TEXT,
ADD COLUMN IF NOT EXISTS dl_expiry_date DATE,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS temp_address TEXT,
ADD COLUMN IF NOT EXISTS perm_address TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT; 