-- Add missing columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(15),
ADD COLUMN IF NOT EXISTS emergency_contact_phone1 VARCHAR(15),
ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(50);

-- Add comments for better documentation
COMMENT ON COLUMN bookings.emergency_contact_phone IS 'Primary emergency contact phone number';
COMMENT ON COLUMN bookings.emergency_contact_phone1 IS 'Secondary emergency contact phone number';
COMMENT ON COLUMN bookings.emergency_contact_relationship IS 'Relationship with emergency contact'; 