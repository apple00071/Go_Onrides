-- Add colleague_phone column to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS colleague_phone TEXT;

-- Add helpful comment
COMMENT ON COLUMN customers.colleague_phone IS 'Phone number of colleague or relative';

-- Set default value for existing rows
UPDATE customers 
SET colleague_phone = NULL 
WHERE colleague_phone IS NULL; 