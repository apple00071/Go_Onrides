-- Add documents column to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT jsonb_build_object(
  'customer_photo', '',
  'aadhar_front', '',
  'aadhar_back', '',
  'dl_front', '',
  'dl_back', ''
);

-- Update existing rows to have the default document structure if they don't have it
UPDATE customers 
SET documents = jsonb_build_object(
  'customer_photo', '',
  'aadhar_front', '',
  'aadhar_back', '',
  'dl_front', '',
  'dl_back', ''
)
WHERE documents IS NULL; 