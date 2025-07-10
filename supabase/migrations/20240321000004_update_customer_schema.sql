-- Add missing columns for submitted documents and alternative phone numbers
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS alternative_phone TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone1 TEXT,
ADD COLUMN IF NOT EXISTS submitted_documents JSONB DEFAULT jsonb_build_object(
  'passport', false,
  'voter_id', false,
  'original_dl', false,
  'original_aadhar', false,
  'other_document', false
);

-- Add helpful comments
COMMENT ON COLUMN customers.alternative_phone IS 'Alternative contact number for the customer';
COMMENT ON COLUMN customers.emergency_contact_phone1 IS 'Secondary emergency contact number (Brother/Friend)';
COMMENT ON COLUMN customers.submitted_documents IS 'JSON object tracking which physical documents have been submitted';

-- Create a trigger to ensure submitted_documents has all required fields
CREATE OR REPLACE FUNCTION ensure_submitted_documents_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.submitted_documents IS NULL THEN
    NEW.submitted_documents := jsonb_build_object(
      'passport', false,
      'voter_id', false,
      'original_dl', false,
      'original_aadhar', false,
      'other_document', false
    );
  ELSE
    -- Ensure all required fields exist with default false if missing
    NEW.submitted_documents := jsonb_build_object(
      'passport', COALESCE((NEW.submitted_documents->>'passport')::boolean, false),
      'voter_id', COALESCE((NEW.submitted_documents->>'voter_id')::boolean, false),
      'original_dl', COALESCE((NEW.submitted_documents->>'original_dl')::boolean, false),
      'original_aadhar', COALESCE((NEW.submitted_documents->>'original_aadhar')::boolean, false),
      'other_document', COALESCE((NEW.submitted_documents->>'other_document')::boolean, false)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_submitted_documents_trigger ON customers;

-- Create trigger
CREATE TRIGGER ensure_submitted_documents_trigger
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION ensure_submitted_documents_fields(); 