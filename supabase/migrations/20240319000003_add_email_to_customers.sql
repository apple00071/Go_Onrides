-- Add email column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
 
-- Update existing customers to have a default email if needed
UPDATE customers SET email = CONCAT(name, '@placeholder.com') WHERE email IS NULL; 