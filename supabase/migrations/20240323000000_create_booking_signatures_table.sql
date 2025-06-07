-- Create booking_signatures table
CREATE TABLE IF NOT EXISTS booking_signatures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    signature_data TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_booking_signatures_booking_id ON booking_signatures(booking_id);

-- Enable Row Level Security
ALTER TABLE booking_signatures ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to view signatures
CREATE POLICY "Allow authenticated users to view signatures"
ON booking_signatures FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow authenticated users to create signatures
CREATE POLICY "Allow authenticated users to create signatures"
ON booking_signatures FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE booking_signatures IS 'Stores customer signatures for completed bookings'; 