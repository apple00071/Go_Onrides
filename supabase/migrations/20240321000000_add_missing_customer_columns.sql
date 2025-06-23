-- Add missing columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) NOT NULL,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(50),
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(15);

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to read customers" ON customers;
DROP POLICY IF EXISTS "Allow users to update their own customer records" ON customers;

-- Create new RLS policies
CREATE POLICY "Allow authenticated users to read customers" 
ON customers FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow users to update their own customer records" 
ON customers FOR UPDATE 
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Add comments for better documentation
COMMENT ON COLUMN customers.created_by IS 'User who created this customer record';
COMMENT ON COLUMN customers.emergency_contact_relationship IS 'Relationship with the emergency contact';
COMMENT ON COLUMN customers.emergency_contact_name IS 'Name of the emergency contact';
COMMENT ON COLUMN customers.emergency_contact_phone IS 'Phone number of the emergency contact'; 