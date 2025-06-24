-- Add rental_purpose and outstation_details columns if they don't exist
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS rental_purpose TEXT CHECK (rental_purpose IN ('local', 'outstation')),
ADD COLUMN IF NOT EXISTS outstation_details JSONB;

-- Update outstation_details schema
COMMENT ON COLUMN bookings.outstation_details IS 'JSON containing outstation details including destination, estimated_kms, start_odo, and end_odo';

-- Create a function to validate outstation_details JSON structure
CREATE OR REPLACE FUNCTION validate_outstation_details()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rental_purpose = 'outstation' AND NEW.outstation_details IS NOT NULL THEN
    -- Validate required fields
    IF NOT (
      NEW.outstation_details ? 'destination' AND
      NEW.outstation_details ? 'estimated_kms' AND
      NEW.outstation_details ? 'start_odo' AND
      NEW.outstation_details ? 'end_odo'
    ) THEN
      RAISE EXCEPTION 'outstation_details must include destination, estimated_kms, start_odo, and end_odo fields';
    END IF;
    
    -- Validate field types
    IF NOT (
      jsonb_typeof(NEW.outstation_details->'destination') = 'string' AND
      (jsonb_typeof(NEW.outstation_details->'estimated_kms') = 'number' OR NEW.outstation_details->'estimated_kms' IS NULL) AND
      (jsonb_typeof(NEW.outstation_details->'start_odo') = 'number' OR NEW.outstation_details->'start_odo' IS NULL) AND
      (jsonb_typeof(NEW.outstation_details->'end_odo') = 'number' OR NEW.outstation_details->'end_odo' IS NULL)
    ) THEN
      RAISE EXCEPTION 'outstation_details fields must be of correct type';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for outstation_details validation
DROP TRIGGER IF EXISTS validate_outstation_details_trigger ON bookings;
CREATE TRIGGER validate_outstation_details_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_outstation_details();

-- Update existing outstation bookings to include new fields
UPDATE bookings
SET outstation_details = jsonb_set(
  COALESCE(outstation_details, '{}'::jsonb),
  '{estimated_kms}',
  '0'::jsonb,
  true
)
WHERE rental_purpose = 'outstation' AND (outstation_details IS NULL OR NOT outstation_details ? 'estimated_kms');

UPDATE bookings
SET outstation_details = jsonb_set(
  outstation_details,
  '{start_odo}',
  '0'::jsonb,
  true
)
WHERE rental_purpose = 'outstation' AND NOT outstation_details ? 'start_odo';

UPDATE bookings
SET outstation_details = jsonb_set(
  outstation_details,
  '{end_odo}',
  '0'::jsonb,
  true
)
WHERE rental_purpose = 'outstation' AND NOT outstation_details ? 'end_odo'; 