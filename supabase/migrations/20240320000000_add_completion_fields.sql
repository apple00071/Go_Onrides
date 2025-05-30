-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add completion-related fields to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS completed_at timestamptz,
ADD COLUMN IF NOT EXISTS vehicle_remarks text,
ADD COLUMN IF NOT EXISTS refund_amount numeric(10, 2);

-- Create vehicle_damages table
CREATE TABLE IF NOT EXISTS vehicle_damages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  description text NOT NULL,
  charges numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Add trigger to update updated_at
DROP TRIGGER IF EXISTS set_timestamp ON vehicle_damages;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON vehicle_damages
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp(); 