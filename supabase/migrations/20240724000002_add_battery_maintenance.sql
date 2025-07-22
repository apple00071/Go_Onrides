-- Create table for battery details
CREATE TABLE IF NOT EXISTS vehicle_batteries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_registration TEXT NOT NULL REFERENCES vehicles(registration),
    old_battery_number TEXT,
    new_battery_number TEXT UNIQUE NOT NULL,
    battery_image_url TEXT,
    installation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    warranty_end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add index for faster lookups
CREATE INDEX idx_vehicle_batteries_registration ON vehicle_batteries(vehicle_registration);
CREATE INDEX idx_vehicle_batteries_numbers ON vehicle_batteries(old_battery_number, new_battery_number);

-- Create or replace function to validate battery numbers
CREATE OR REPLACE FUNCTION validate_battery_numbers()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure old and new battery numbers are different
    IF NEW.old_battery_number = NEW.new_battery_number THEN
        RAISE EXCEPTION 'Old and new battery numbers cannot be the same';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for battery number validation
CREATE TRIGGER validate_battery_numbers_trigger
    BEFORE INSERT OR UPDATE ON vehicle_batteries
    FOR EACH ROW
    EXECUTE FUNCTION validate_battery_numbers();

-- Add battery-related columns to vehicle_maintenance table
ALTER TABLE vehicle_maintenance
ADD COLUMN IF NOT EXISTS battery_details UUID REFERENCES vehicle_batteries(id),
ADD COLUMN IF NOT EXISTS battery_health_percentage INTEGER CHECK (battery_health_percentage BETWEEN 0 AND 100); 