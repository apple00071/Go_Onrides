-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model TEXT NOT NULL,
    registration TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
    added_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_maintenance_date TIMESTAMP WITH TIME ZONE,
    next_maintenance_date TIMESTAMP WITH TIME ZONE,
    total_bookings INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    maintenance_history JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

-- Create index on registration for faster lookups
CREATE INDEX idx_vehicles_registration ON vehicles(registration);

-- Create function to update vehicle statistics
CREATE OR REPLACE FUNCTION update_vehicle_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update vehicle statistics for both completed and in-use bookings
    WITH booking_stats AS (
        SELECT 
            COUNT(*) as total_bookings,
            COALESCE(SUM(paid_amount), 0) as total_revenue
        FROM bookings
        WHERE vehicle_details->>'registration' = NEW.vehicle_details->>'registration'
        AND status IN ('completed', 'in_use')
    )
    UPDATE vehicles
    SET 
        total_bookings = booking_stats.total_bookings,
        total_revenue = booking_stats.total_revenue
    FROM booking_stats
    WHERE registration = NEW.vehicle_details->>'registration';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update vehicle stats on booking changes
DROP TRIGGER IF EXISTS update_vehicle_stats_on_booking ON bookings;
CREATE TRIGGER update_vehicle_stats_on_booking
    AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicle_stats();

-- Create function to automatically add new vehicles from bookings
CREATE OR REPLACE FUNCTION add_vehicle_from_booking()
RETURNS TRIGGER AS $$
BEGIN
    -- Only insert if vehicle doesn't exist
    INSERT INTO vehicles (
        model,
        registration,
        created_by,
        status
    )
    SELECT
        NEW.vehicle_details->>'model',
        NEW.vehicle_details->>'registration',
        NEW.created_by,
        CASE 
            WHEN NEW.status = 'confirmed' OR NEW.status = 'in_use' THEN 'in_use'
            WHEN NEW.status = 'completed' THEN 'available'
            ELSE 'available'
        END
    WHERE NOT EXISTS (
        SELECT 1 FROM vehicles 
        WHERE registration = NEW.vehicle_details->>'registration'
    );

    -- Update vehicle status if it exists
    UPDATE vehicles
    SET 
        status = CASE 
            WHEN NEW.status = 'confirmed' OR NEW.status = 'in_use' THEN 'in_use'
            WHEN NEW.status = 'completed' THEN 'available'
            ELSE status -- Keep current status for other cases
        END,
        updated_at = NOW(),
        updated_by = NEW.created_by
    WHERE registration = NEW.vehicle_details->>'registration';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to add vehicles from bookings
DROP TRIGGER IF EXISTS add_vehicle_from_booking ON bookings;
CREATE TRIGGER add_vehicle_from_booking
    AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION add_vehicle_from_booking(); 