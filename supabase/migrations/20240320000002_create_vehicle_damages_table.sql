-- Drop existing table and its trigger if they exist
DROP TRIGGER IF EXISTS update_vehicle_damages_updated_at ON vehicle_damages;
DROP TABLE IF EXISTS vehicle_damages;

-- Create vehicle_damages table
CREATE TABLE vehicle_damages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    description TEXT,
    charges DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

-- Add RLS policies
ALTER TABLE vehicle_damages ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access for authenticated users" ON vehicle_damages
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow insert access to authenticated users
CREATE POLICY "Allow insert access for authenticated users" ON vehicle_damages
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow update access to authenticated users
CREATE POLICY "Allow update access for authenticated users" ON vehicle_damages
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Add indexes
CREATE INDEX idx_vehicle_damages_booking_id ON vehicle_damages(booking_id);
CREATE INDEX idx_vehicle_damages_created_by ON vehicle_damages(created_by);

-- Add trigger for updated_at using existing function
CREATE TRIGGER update_vehicle_damages_updated_at
    BEFORE UPDATE ON vehicle_damages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 