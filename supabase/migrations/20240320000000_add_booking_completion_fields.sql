-- Add new fields to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS damage_charges DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS odometer_reading TEXT,
ADD COLUMN IF NOT EXISTS fuel_level TEXT,
ADD COLUMN IF NOT EXISTS vehicle_condition JSONB,
ADD COLUMN IF NOT EXISTS inspection_notes TEXT,
ADD COLUMN IF NOT EXISTS return_checklist JSONB;

-- Create table for storing signatures
CREATE TABLE IF NOT EXISTS booking_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(booking_id)
);

-- Create table for storing vehicle damages
CREATE TABLE IF NOT EXISTS vehicle_damages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  description TEXT,
  charges DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add RLS policies for the new tables
ALTER TABLE booking_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_damages ENABLE ROW LEVEL SECURITY;

-- Signatures can be read by anyone in the organization
CREATE POLICY "Signatures are viewable by organization users" ON booking_signatures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN organizations_users ou ON b.organization_id = ou.organization_id
      WHERE b.id = booking_signatures.booking_id
      AND ou.user_id = auth.uid()
    )
  );

-- Signatures can only be created by organization users
CREATE POLICY "Signatures can be created by organization users" ON booking_signatures
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN organizations_users ou ON b.organization_id = ou.organization_id
      WHERE b.id = booking_signatures.booking_id
      AND ou.user_id = auth.uid()
    )
  );

-- Vehicle damages can be read by anyone in the organization
CREATE POLICY "Vehicle damages are viewable by organization users" ON vehicle_damages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN organizations_users ou ON b.organization_id = ou.organization_id
      WHERE b.id = vehicle_damages.booking_id
      AND ou.user_id = auth.uid()
    )
  );

-- Vehicle damages can only be created by organization users
CREATE POLICY "Vehicle damages can be created by organization users" ON vehicle_damages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN organizations_users ou ON b.organization_id = ou.organization_id
      WHERE b.id = vehicle_damages.booking_id
      AND ou.user_id = auth.uid()
    )
  ); 