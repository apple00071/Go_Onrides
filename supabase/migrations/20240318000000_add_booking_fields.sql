-- Add new columns to bookings table
ALTER TABLE bookings
ADD COLUMN emergency_contact_name TEXT,
ADD COLUMN emergency_contact_phone TEXT,
ADD COLUMN aadhar_number TEXT,
ADD COLUMN date_of_birth DATE,
ADD COLUMN dl_number TEXT,
ADD COLUMN dl_expiry_date DATE,
ADD COLUMN security_deposit_amount DECIMAL(10,2),
ADD COLUMN temp_address TEXT,
ADD COLUMN perm_address TEXT,
ADD COLUMN pickup_time TIME,
ADD COLUMN dropoff_time TIME;

-- Add not null constraints to existing records
UPDATE bookings SET
  emergency_contact_name = customer_name,
  emergency_contact_phone = customer_contact,
  temp_address = '',
  perm_address = '',
  pickup_time = '00:00:00'::TIME,
  dropoff_time = '00:00:00'::TIME,
  security_deposit_amount = 0
WHERE emergency_contact_name IS NULL;

-- Add not null constraints
ALTER TABLE bookings
ALTER COLUMN emergency_contact_name SET NOT NULL,
ALTER COLUMN emergency_contact_phone SET NOT NULL,
ALTER COLUMN temp_address SET NOT NULL,
ALTER COLUMN perm_address SET NOT NULL,
ALTER COLUMN pickup_time SET NOT NULL,
ALTER COLUMN dropoff_time SET NOT NULL,
ALTER COLUMN security_deposit_amount SET NOT NULL; 