-- Function to generate booking ID in GNXYY format
CREATE OR REPLACE FUNCTION generate_booking_id(created_date timestamptz) 
RETURNS text AS $$
DECLARE
    year_suffix text;
    latest_number int;
    new_booking_id text;
BEGIN
    -- Get the year suffix (YY) from the created_date
    year_suffix := to_char(created_date, 'YY');
    
    -- Find the latest number for this year
    SELECT COALESCE(MAX(NULLIF(regexp_replace(booking_id, '^GN(\d+)\d{2}$', '\1'), '')), 0)::int
    INTO latest_number
    FROM bookings
    WHERE booking_id ~ ('^GN\d+' || year_suffix || '$');
    
    -- Generate new booking ID
    new_booking_id := 'GN' || (latest_number + 1)::text || year_suffix;
    
    RETURN new_booking_id;
END;
$$ LANGUAGE plpgsql;

-- Temporarily remove the format check constraint if it exists
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS booking_id_format_check;

-- Update existing bookings with new format
DO $$
DECLARE
    booking_record RECORD;
BEGIN
    FOR booking_record IN 
        SELECT id, created_at 
        FROM bookings 
        WHERE booking_id !~ '^GN\d+\d{2}$'
        OR booking_id IS NULL
        ORDER BY created_at ASC
    LOOP
        UPDATE bookings 
        SET booking_id = generate_booking_id(booking_record.created_at)
        WHERE id = booking_record.id;
    END LOOP;
END;
$$;

-- Add back the format check constraint
ALTER TABLE bookings
ADD CONSTRAINT booking_id_format_check 
CHECK (booking_id ~ '^GN\d+\d{2}$');

-- Drop the function as it's no longer needed after migration
DROP FUNCTION generate_booking_id; 