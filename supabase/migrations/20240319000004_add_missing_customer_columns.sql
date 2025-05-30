-- Add missing columns to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS signature TEXT;

-- Update existing customers to have default values if needed
UPDATE customers 
SET date_of_birth = NULL,
    signature = NULL
WHERE date_of_birth IS NULL
   OR signature IS NULL; 