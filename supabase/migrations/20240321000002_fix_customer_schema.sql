-- First ensure all necessary columns exist with consistent naming
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS contact TEXT,
ADD COLUMN IF NOT EXISTS alternative_phone TEXT,
ADD COLUMN IF NOT EXISTS aadhar_number TEXT,
ADD COLUMN IF NOT EXISTS dl_number TEXT,
ADD COLUMN IF NOT EXISTS dl_expiry_date DATE,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
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
ADD COLUMN IF NOT EXISTS emergency_contact_phone1 TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT,
ADD COLUMN IF NOT EXISTS colleague_phone TEXT,
ADD COLUMN IF NOT EXISTS documents JSONB,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Migrate data from contact to phone if needed
UPDATE customers 
SET phone = contact 
WHERE phone IS NULL AND contact IS NOT NULL;

-- Migrate data from phone to contact if needed
UPDATE customers 
SET contact = phone 
WHERE contact IS NULL AND phone IS NOT NULL;

-- Set NOT NULL constraints on required fields
ALTER TABLE customers
ALTER COLUMN name SET NOT NULL,
ALTER COLUMN phone SET NOT NULL,
ALTER COLUMN contact SET NOT NULL,
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN updated_at SET NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN customers.name IS 'Full name of the customer';
COMMENT ON COLUMN customers.email IS 'Email address of the customer';
COMMENT ON COLUMN customers.phone IS 'Primary phone number';
COMMENT ON COLUMN customers.contact IS 'Primary contact number (same as phone)';
COMMENT ON COLUMN customers.alternative_phone IS 'Alternative contact number';
COMMENT ON COLUMN customers.aadhar_number IS 'Aadhar card number';
COMMENT ON COLUMN customers.dl_number IS 'Driving license number';
COMMENT ON COLUMN customers.dl_expiry_date IS 'Driving license expiry date';
COMMENT ON COLUMN customers.date_of_birth IS 'Date of birth';
COMMENT ON COLUMN customers.temp_address_street IS 'Temporary address street';
COMMENT ON COLUMN customers.temp_address_city IS 'Temporary address city';
COMMENT ON COLUMN customers.temp_address_state IS 'Temporary address state';
COMMENT ON COLUMN customers.temp_address_pincode IS 'Temporary address pincode';
COMMENT ON COLUMN customers.perm_address_street IS 'Permanent address street';
COMMENT ON COLUMN customers.perm_address_city IS 'Permanent address city';
COMMENT ON COLUMN customers.perm_address_state IS 'Permanent address state';
COMMENT ON COLUMN customers.perm_address_pincode IS 'Permanent address pincode';
COMMENT ON COLUMN customers.emergency_contact_name IS 'Name of emergency contact';
COMMENT ON COLUMN customers.emergency_contact_phone IS 'Primary emergency contact number';
COMMENT ON COLUMN customers.emergency_contact_phone1 IS 'Secondary emergency contact number';
COMMENT ON COLUMN customers.emergency_contact_relationship IS 'Relationship with emergency contact';
COMMENT ON COLUMN customers.colleague_phone IS 'Phone number of colleague or relative';
COMMENT ON COLUMN customers.documents IS 'JSON object containing document URLs';
COMMENT ON COLUMN customers.created_by IS 'Reference to the user who created this record';
COMMENT ON COLUMN customers.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN customers.updated_at IS 'Timestamp when the record was last updated'; 