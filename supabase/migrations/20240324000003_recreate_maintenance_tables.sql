-- Drop existing tables and types if they exist
DROP TABLE IF EXISTS vehicle_maintenance CASCADE;
DROP TABLE IF EXISTS vehicle_batteries CASCADE;
DROP TYPE IF EXISTS maintenance_type CASCADE;
DROP TYPE IF EXISTS fuel_level_type CASCADE;

-- Create maintenance_type enum
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

-- Create vehicle_batteries table for battery maintenance details
CREATE TABLE vehicle_batteries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_registration TEXT REFERENCES vehicles(registration) ON DELETE CASCADE,
    old_battery_number TEXT,
    new_battery_number TEXT,
    battery_image_url TEXT,
    old_battery_image_url TEXT,
    warranty_card_image_url TEXT,
    warranty_end_date TIMESTAMP WITH TIME ZONE,
    warranty_details TEXT,
    battery_health INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

-- Create vehicle_maintenance table
CREATE TABLE vehicle_maintenance (
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
    battery_details UUID REFERENCES vehicle_batteries(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for better query performance
CREATE INDEX idx_vehicle_maintenance_registration ON vehicle_maintenance(vehicle_registration);
CREATE INDEX idx_vehicle_maintenance_date ON vehicle_maintenance(maintenance_date);
CREATE INDEX idx_vehicle_maintenance_type ON vehicle_maintenance(maintenance_type);
CREATE INDEX idx_vehicle_batteries_registration ON vehicle_batteries(vehicle_registration);

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

-- Create trigger to update vehicle maintenance dates
CREATE TRIGGER update_vehicle_maintenance_dates
    AFTER INSERT OR UPDATE ON vehicle_maintenance
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicle_maintenance_date();

-- Grant necessary permissions
GRANT ALL ON vehicle_maintenance TO authenticated;
GRANT ALL ON vehicle_maintenance TO service_role;
GRANT ALL ON vehicle_batteries TO authenticated;
GRANT ALL ON vehicle_batteries TO service_role;
GRANT USAGE ON TYPE maintenance_type TO authenticated;
GRANT USAGE ON TYPE maintenance_type TO service_role;

-- Force a schema reload
NOTIFY pgrst, 'reload schema'; 