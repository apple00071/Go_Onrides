
-- Function to check active bookings and update vehicle status after maintenance
CREATE OR REPLACE FUNCTION update_vehicle_status_after_maintenance()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if vehicle has any active bookings
    IF NOT EXISTS (
        SELECT 1 
        FROM bookings 
        WHERE vehicle_details->>'registration' = NEW.vehicle_registration
        AND status IN ('confirmed', 'in_use')
    ) THEN
        -- No active bookings, update vehicle status to available
        UPDATE vehicles
        SET 
            status = 'available',
            updated_at = NOW()
        WHERE registration = NEW.vehicle_registration;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update vehicle status after maintenance
DROP TRIGGER IF EXISTS update_vehicle_status_after_maintenance ON vehicle_maintenance;
CREATE TRIGGER update_vehicle_status_after_maintenance
    AFTER INSERT ON vehicle_maintenance
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicle_status_after_maintenance();

-- Add constraint to prevent status change if vehicle has active booking
ALTER TABLE vehicles
DROP CONSTRAINT IF EXISTS prevent_status_change_with_active_booking;

CREATE OR REPLACE FUNCTION check_active_booking_before_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check when trying to change status from 'maintenance' to something else
    IF OLD.status = 'maintenance' AND NEW.status != OLD.status THEN
        -- Check if vehicle has any active bookings
        IF EXISTS (
            SELECT 1 
            FROM bookings 
            WHERE vehicle_details->>'registration' = NEW.registration
            AND status IN ('confirmed', 'in_use')
        ) THEN
            RAISE EXCEPTION 'Cannot change vehicle status: Vehicle has active bookings';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_status_change_with_active_booking
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION check_active_booking_before_status_change(); 