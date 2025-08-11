-- Drop existing triggers
DROP TRIGGER IF EXISTS add_vehicle_from_booking ON bookings;
DROP TRIGGER IF EXISTS prevent_status_change_with_active_booking ON vehicles;

-- Update the add_vehicle_from_booking function to handle overlapping bookings
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

    -- Update vehicle status if it exists and the booking is active
    IF NEW.status IN ('confirmed', 'in_use') THEN
        UPDATE vehicles
        SET 
            status = 'in_use',
            updated_at = NOW(),
            updated_by = NEW.created_by
        WHERE registration = NEW.vehicle_details->>'registration';
    -- Set to available only if there are no other active bookings
    ELSIF NEW.status = 'completed' THEN
        UPDATE vehicles v
        SET 
            status = CASE 
                WHEN NOT EXISTS (
                    SELECT 1 
                    FROM bookings b 
                    WHERE b.vehicle_details->>'registration' = v.registration
                    AND b.id != NEW.id
                    AND b.status IN ('confirmed', 'in_use')
                ) THEN 'available'
                ELSE v.status
            END,
            updated_at = NOW(),
            updated_by = NEW.created_by
        WHERE registration = NEW.vehicle_details->>'registration';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to add vehicles from bookings
CREATE TRIGGER add_vehicle_from_booking
    AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION add_vehicle_from_booking();

-- Update the check_active_booking_before_status_change function
CREATE OR REPLACE FUNCTION check_active_booking_before_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check when trying to change status to 'maintenance'
    IF NEW.status = 'maintenance' AND OLD.status != 'maintenance' THEN
        -- Check if vehicle has any active bookings
        IF EXISTS (
            SELECT 1 
            FROM bookings 
            WHERE vehicle_details->>'registration' = NEW.registration
            AND status IN ('confirmed', 'in_use')
        ) THEN
            RAISE EXCEPTION 'Cannot change vehicle status to maintenance: Vehicle has active bookings';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent status changes with active bookings
CREATE TRIGGER prevent_status_change_with_active_booking
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION check_active_booking_before_status_change(); 