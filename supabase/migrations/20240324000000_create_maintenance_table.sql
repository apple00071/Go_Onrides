-- Drop existing maintenance_type enum if it exists
DROP TYPE IF EXISTS maintenance_type CASCADE;

-- Create maintenance_types enum
CREATE TYPE maintenance_type AS ENUM (
    'engine_oil',
    'oil_filter',
    'air_filter',
    'tyre_change',
    'tyre_rotation',
    'brake_pads',
    'chain_sprocket',
    'general_service',
    'battery',
    'other'
);

-- Create maintenance table
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_registration TEXT REFERENCES vehicles(registration) ON DELETE CASCADE,
    maintenance_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    maintenance_type maintenance_type NOT NULL,
    description TEXT,
    cost DECIMAL(10,2),
    next_due_date TIMESTAMP WITH TIME ZONE,
    next_due_km INTEGER,
    odometer_reading INTEGER,
    performed_by TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

-- Drop existing index if it exists
DROP INDEX IF EXISTS idx_vehicle_maintenance_registration;

-- Create index for faster lookups
CREATE INDEX idx_vehicle_maintenance_registration ON vehicle_maintenance(vehicle_registration);

-- Modify vehicle_maintenance table to support multiple maintenance types
ALTER TABLE vehicle_maintenance 
DROP COLUMN IF EXISTS maintenance_type,
ADD COLUMN IF NOT EXISTS maintenance_types TEXT[] NOT NULL DEFAULT '{}';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_types 
ON vehicle_maintenance USING GIN (maintenance_types);

-- Update the vehicle_batteries table to ensure all image URLs are tracked
ALTER TABLE vehicle_batteries
ADD COLUMN IF NOT EXISTS battery_image_url TEXT,
ADD COLUMN IF NOT EXISTS old_battery_image_url TEXT,
ADD COLUMN IF NOT EXISTS warranty_card_image_url TEXT;

-- Create a function to get battery images for a maintenance record
CREATE OR REPLACE FUNCTION get_battery_images(maintenance_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'battery_image', vb.battery_image_url,
            'old_battery_image', vb.old_battery_image_url,
            'warranty_card_image', vb.warranty_card_image_url
        )
        FROM vehicle_maintenance vm
        LEFT JOIN vehicle_batteries vb ON vm.battery_details = vb.id
        WHERE vm.id = maintenance_id
    );
END;
$$;

-- Create function to update vehicle's next maintenance date
CREATE OR REPLACE FUNCTION update_vehicle_maintenance_date()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE vehicles
    SET 
        last_maintenance_date = NEW.maintenance_date,
        next_maintenance_date = NEW.next_due_date,
        updated_at = NOW()
    WHERE registration = NEW.vehicle_registration;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_vehicle_maintenance_dates ON vehicle_maintenance;

-- Create trigger to update vehicle maintenance dates
CREATE TRIGGER update_vehicle_maintenance_dates
    AFTER INSERT OR UPDATE ON vehicle_maintenance
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicle_maintenance_date();

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema'; 