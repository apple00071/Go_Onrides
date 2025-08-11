-- Add updated_by column to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add comment for documentation
COMMENT ON COLUMN customers.updated_by IS 'User who last updated this customer record';

-- Update RLS policies to handle updated_by
DROP POLICY IF EXISTS "Allow users to update their own customer records" ON customers;

CREATE POLICY "Allow users to update their own customer records" 
ON customers FOR UPDATE 
TO authenticated
USING (
  auth.uid() = created_by OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND (
      role = 'admin' OR 
      permissions->>'manageCustomers' = 'true'
    )
  )
)
WITH CHECK (
  auth.uid() = created_by OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND (
      role = 'admin' OR 
      permissions->>'manageCustomers' = 'true'
    )
  )
); 