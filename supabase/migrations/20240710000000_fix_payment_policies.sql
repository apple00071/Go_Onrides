-- Drop existing payment policies
DROP POLICY IF EXISTS "Allow only admins to update payments" ON payments;
DROP POLICY IF EXISTS "Allow only admins to delete payments" ON payments;
DROP POLICY IF EXISTS "Allow users to view payments with permission" ON payments;
DROP POLICY IF EXISTS "Allow users to manage payments with permission" ON payments;

-- Create new policies that respect both admin role and managePayments permission
CREATE POLICY "Allow users to view payments"
ON payments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND (
      role = 'admin' OR
      permissions->>'managePayments' = 'true'
    )
  )
);

CREATE POLICY "Allow users to manage payments"
ON payments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND (
      role = 'admin' OR
      permissions->>'managePayments' = 'true'
    )
  )
); 