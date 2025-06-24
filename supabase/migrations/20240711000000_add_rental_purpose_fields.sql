-- Add rental purpose and outstation details fields to bookings table if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'bookings' AND column_name = 'rental_purpose') THEN
        ALTER TABLE bookings
        ADD COLUMN rental_purpose text CHECK (rental_purpose IN ('local', 'outstation'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'bookings' AND column_name = 'outstation_details') THEN
        ALTER TABLE bookings
        ADD COLUMN outstation_details jsonb;
    END IF;
END $$;

-- Add comment to explain the fields
COMMENT ON COLUMN bookings.rental_purpose IS 'Purpose of the rental - either local or outstation';
COMMENT ON COLUMN bookings.outstation_details IS 'Additional details for outstation bookings including destination, estimated kilometers, and odometer readings';

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS validate_outstation_details_trigger ON bookings;
DROP FUNCTION IF EXISTS validate_outstation_details();

-- Add validation for outstation details
CREATE OR REPLACE FUNCTION validate_outstation_details()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rental_purpose = 'outstation' THEN
    IF NEW.outstation_details IS NULL OR
       NEW.outstation_details->>'destination' IS NULL OR
       NEW.outstation_details->>'estimated_kms' IS NULL OR
       NEW.outstation_details->>'start_odo' IS NULL OR
       CAST(NEW.outstation_details->>'estimated_kms' AS INTEGER) <= 0 OR
       CAST(NEW.outstation_details->>'start_odo' AS INTEGER) < 0 THEN
      RAISE EXCEPTION 'Invalid outstation details. Required fields: destination, estimated_kms (> 0), and start_odo (>= 0)';
    END IF;
    
    -- Only validate end_odo if it's provided
    IF NEW.outstation_details->>'end_odo' IS NOT NULL THEN
      IF CAST(NEW.outstation_details->>'end_odo' AS INTEGER) < CAST(NEW.outstation_details->>'start_odo' AS INTEGER) THEN
        RAISE EXCEPTION 'End odometer reading cannot be less than start odometer reading';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for outstation details validation
CREATE TRIGGER validate_outstation_details_trigger
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION validate_outstation_details(); 