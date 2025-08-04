-- Add assigned_worker_id column to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS assigned_worker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_worker ON bookings(assigned_worker_id);

-- Update RLS policies to allow workers to view their assigned bookings
CREATE POLICY "Workers can view their assigned bookings"
ON bookings FOR SELECT
TO authenticated
USING (
  (assigned_worker_id = auth.uid() AND 
   EXISTS (
     SELECT 1 FROM profiles 
     WHERE profiles.id = auth.uid() 
     AND profiles.role = 'worker'
   ))
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Add helpful comment
COMMENT ON COLUMN bookings.assigned_worker_id IS 'References the worker assigned to handle this booking'; 