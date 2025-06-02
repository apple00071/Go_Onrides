-- Revoke existing policies
DROP POLICY IF EXISTS "Allow users to update bookings with permission" ON bookings;
DROP POLICY IF EXISTS "Allow users to delete bookings with permission" ON bookings;
DROP POLICY IF EXISTS "Allow users to update customers with permission" ON customers;
DROP POLICY IF EXISTS "Allow users to delete customers with permission" ON customers;
DROP POLICY IF EXISTS "Allow users to update payments" ON payments;
DROP POLICY IF EXISTS "Allow users to delete payments" ON payments;

-- Create stricter policies for bookings
CREATE POLICY "Allow only admins to update bookings"
ON bookings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Allow only admins to delete bookings"
ON bookings FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create stricter policies for customers
CREATE POLICY "Allow only admins to update customers"
ON customers FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Allow only admins to delete customers"
ON customers FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create stricter policies for payments
CREATE POLICY "Allow only admins to update payments"
ON payments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Allow only admins to delete payments"
ON payments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Set more specific policy for uploading documents
DROP POLICY IF EXISTS "Allow users to upload documents with permission" ON documents;

CREATE POLICY "Allow only admins to upload documents"
ON documents FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Track the user who last updated each record
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Create triggers to automatically update the updated_by field
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bookings_set_updated_by
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_updated_by();

CREATE TRIGGER trigger_customers_set_updated_by
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION set_updated_by();

CREATE TRIGGER trigger_payments_set_updated_by
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION set_updated_by(); 