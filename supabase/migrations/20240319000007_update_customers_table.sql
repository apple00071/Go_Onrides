-- Drop existing columns that will be replaced
ALTER TABLE customers
DROP COLUMN IF EXISTS identification,
DROP COLUMN IF EXISTS address,
DROP COLUMN IF EXISTS emergency_contact;

-- Add new individual columns
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS dob DATE,
ADD COLUMN IF NOT EXISTS aadhar_number TEXT,
ADD COLUMN IF NOT EXISTS dl_number TEXT,
ADD COLUMN IF NOT EXISTS dl_expiry_date DATE,
ADD COLUMN IF NOT EXISTS temp_address_street TEXT,
ADD COLUMN IF NOT EXISTS temp_address_city TEXT,
ADD COLUMN IF NOT EXISTS temp_address_state TEXT,
ADD COLUMN IF NOT EXISTS temp_address_pincode TEXT,
ADD COLUMN IF NOT EXISTS perm_address_street TEXT,
ADD COLUMN IF NOT EXISTS perm_address_city TEXT,
ADD COLUMN IF NOT EXISTS perm_address_state TEXT,
ADD COLUMN IF NOT EXISTS perm_address_pincode TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT; 