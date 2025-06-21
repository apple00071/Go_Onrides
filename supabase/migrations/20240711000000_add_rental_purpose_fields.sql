-- Add rental purpose and outstation details fields to bookings table
ALTER TABLE bookings
ADD COLUMN rental_purpose text NOT NULL DEFAULT 'local' CHECK (rental_purpose IN ('local', 'outstation')),
ADD COLUMN outstation_details jsonb;

-- Add comment to explain the fields
COMMENT ON COLUMN bookings.rental_purpose IS 'Purpose of the rental - either local or outstation';
COMMENT ON COLUMN bookings.outstation_details IS 'Additional details for outstation bookings including odd meter reading, destination, and estimated kilometers';

-- Create a function to validate outstation details
CREATE OR REPLACE FUNCTION validate_outstation_details()
RETURNS trigger AS $$
BEGIN
  IF NEW.rental_purpose = 'outstation' AND (
    NEW.outstation_details IS NULL OR 
    NEW.outstation_details->>'odd_meter_reading' IS NULL OR 
    NEW.outstation_details->>'destination' IS NULL OR 
    NEW.outstation_details->>'estimated_km' IS NULL
  ) THEN
    RAISE EXCEPTION 'Outstation bookings require odd meter reading, destination, and estimated kilometers';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate outstation details
CREATE TRIGGER validate_outstation_details_trigger
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION validate_outstation_details(); 