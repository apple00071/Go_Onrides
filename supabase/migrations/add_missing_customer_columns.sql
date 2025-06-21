-- First add all columns as nullable
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS alternative_phone TEXT NULL,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT NULL,
ADD COLUMN IF NOT EXISTS emergency_contact_phone1 TEXT NULL,
ADD COLUMN IF NOT EXISTS temp_address_street TEXT NULL,
ADD COLUMN IF NOT EXISTS perm_address_street TEXT NULL,
ADD COLUMN IF NOT EXISTS dl_number TEXT NULL,
ADD COLUMN IF NOT EXISTS dl_expiry_date DATE NULL,
ADD COLUMN IF NOT EXISTS documents JSONB NULL;

-- Add helpful comments
COMMENT ON COLUMN customers.alternative_phone IS 'Alternative contact number for the customer';
COMMENT ON COLUMN customers.emergency_contact_phone IS 'Primary emergency contact phone number';
COMMENT ON COLUMN customers.emergency_contact_phone1 IS 'Secondary emergency contact phone number';
COMMENT ON COLUMN customers.temp_address_street IS 'Temporary address of the customer';
COMMENT ON COLUMN customers.perm_address_street IS 'Permanent address of the customer';
COMMENT ON COLUMN customers.dl_number IS 'Driving license number';
COMMENT ON COLUMN customers.dl_expiry_date IS 'Driving license expiry date';
COMMENT ON COLUMN customers.documents IS 'JSON object containing document URLs (customer_photo, aadhar_front, aadhar_back, dl_front, dl_back)';

-- Set default values for existing rows
UPDATE customers 
SET emergency_contact_phone = COALESCE(emergency_contact_phone, phone);

UPDATE customers 
SET dl_number = COALESCE(dl_number, 'PENDING');

-- Now add NOT NULL constraints
ALTER TABLE customers
ALTER COLUMN emergency_contact_phone SET NOT NULL,
ALTER COLUMN dl_number SET NOT NULL; 