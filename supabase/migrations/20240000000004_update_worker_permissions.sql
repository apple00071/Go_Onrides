-- First, drop existing policies to recreate them with proper permissions
DROP POLICY IF EXISTS "Workers can view their assigned bookings" ON bookings;
DROP POLICY IF EXISTS "Workers can create bookings" ON bookings;
DROP POLICY IF EXISTS "Workers can update bookings" ON bookings;
DROP POLICY IF EXISTS "Workers can delete bookings" ON bookings;
DROP POLICY IF EXISTS "Admins full access" ON bookings;

-- Enable RLS if not already enabled
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy for workers to view bookings (either assigned to them or created by them)
CREATE POLICY "Workers can view their assigned bookings"
ON bookings FOR SELECT
TO authenticated
USING (
  (
    -- Worker can view if assigned to them
    (assigned_worker_id = auth.uid() OR created_by = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'worker'
    )
  )
  OR
  -- Admins can view all
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Policy for workers to create new bookings
CREATE POLICY "Workers can create bookings"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'worker'
  )
);

-- Policy for admins to have full access
CREATE POLICY "Admins full access"
ON bookings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Add trigger to automatically set created_by when a booking is created
CREATE OR REPLACE FUNCTION public.set_booking_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_booking_created_by_trigger ON bookings;
CREATE TRIGGER set_booking_created_by_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_booking_created_by();

-- Add helpful comments
COMMENT ON POLICY "Workers can view their assigned bookings" ON bookings IS 'Workers can only view bookings assigned to them or created by them';
COMMENT ON POLICY "Workers can create bookings" ON bookings IS 'Workers can create new bookings';
COMMENT ON POLICY "Admins full access" ON bookings IS 'Admins have full CRUD access to all bookings'; 