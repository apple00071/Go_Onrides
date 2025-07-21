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
    -- Update total bookings and revenue when a booking is completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE vehicles
        SET 
            total_bookings = total_bookings + 1,
            total_revenue = total_revenue + NEW.booking_amount
        WHERE registration = NEW.vehicle_details->>'registration';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update vehicle stats on booking completion
CREATE TRIGGER update_vehicle_stats_on_booking
    AFTER UPDATE ON bookings
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
            ELSE 'available'
        END,
        updated_at = NOW(),
        updated_by = NEW.created_by
    WHERE registration = NEW.vehicle_details->>'registration';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to add vehicles from bookings
CREATE TRIGGER add_vehicle_from_booking
    AFTER INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION add_vehicle_from_booking(); 