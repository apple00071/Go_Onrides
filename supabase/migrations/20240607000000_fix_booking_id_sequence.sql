-- Function to generate padded booking ID
CREATE OR REPLACE FUNCTION generate_padded_booking_id(old_id text)
RETURNS text AS $$
DECLARE
    year_suffix text;
    number_part int;
    padded_number text;
BEGIN
    -- Extract the year suffix (last 2 digits)
    year_suffix := RIGHT(old_id, 2);
    
    -- Extract the number part (remove 'GN' prefix and year suffix)
    number_part := (regexp_replace(old_id, '^GN(\d+)\d{2}$', '\1'))::int;
    
    -- Pad the number to 5 digits
    padded_number := LPAD(number_part::text, 5, '0');
    
    -- Return the new format: GN + padded number + year
    RETURN 'GN' || padded_number || year_suffix;
END;
$$ LANGUAGE plpgsql;

-- Temporarily disable the format check constraint if it exists
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS booking_id_format_check;

-- Create a temporary sequence to ensure unique numbers
CREATE SEQUENCE IF NOT EXISTS booking_number_seq START WITH 125;

-- Update existing bookings with new sequential format
DO $$
DECLARE
    booking_record RECORD;
BEGIN
    FOR booking_record IN 
        SELECT id 
        FROM bookings 
        ORDER BY created_at ASC
    LOOP
        UPDATE bookings 
        SET booking_id = 'GN' || nextval('booking_number_seq')::text
        WHERE id = booking_record.id;
    END LOOP;
END;
$$;

-- Add back the format check constraint with updated pattern
ALTER TABLE bookings
ADD CONSTRAINT booking_id_format_check 
CHECK (booking_id ~ '^GN\d+$');

-- Drop the temporary sequence
DROP SEQUENCE booking_number_seq;

-- Drop the function as it's no longer needed
DROP FUNCTION generate_padded_booking_id; 