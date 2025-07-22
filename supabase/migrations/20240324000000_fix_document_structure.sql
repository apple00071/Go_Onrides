-- Ensure customers have the correct document structure
UPDATE customers 
SET documents = jsonb_build_object(
  'customer_photo', COALESCE((documents->>'customer_photo')::text, ''),
  'aadhar_front', COALESCE((documents->>'aadhar_front')::text, ''),
  'aadhar_back', COALESCE((documents->>'aadhar_back')::text, ''),
  'dl_front', COALESCE((documents->>'dl_front')::text, ''),
  'dl_back', COALESCE((documents->>'dl_back')::text, '')
)
WHERE documents IS NULL OR NOT (documents ?& array['customer_photo', 'aadhar_front', 'aadhar_back', 'dl_front', 'dl_back']);

-- Ensure bookings have the correct submitted_documents structure
UPDATE bookings
SET submitted_documents = jsonb_build_object(
  'passport', COALESCE((submitted_documents->>'passport')::boolean, false),
  'voter_id', COALESCE((submitted_documents->>'voter_id')::boolean, false),
  'original_dl', COALESCE((submitted_documents->>'original_dl')::boolean, false),
  'original_aadhar', COALESCE((submitted_documents->>'original_aadhar')::boolean, false),
  'other_document', COALESCE((submitted_documents->>'other_document')::boolean, false)
)
WHERE submitted_documents IS NULL OR NOT (submitted_documents ?& array['passport', 'voter_id', 'original_dl', 'original_aadhar', 'other_document']);

-- Add trigger to maintain document structure on customers table
CREATE OR REPLACE FUNCTION ensure_customer_documents_structure()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.documents IS NULL THEN
    NEW.documents := jsonb_build_object(
      'customer_photo', '',
      'aadhar_front', '',
      'aadhar_back', '',
      'dl_front', '',
      'dl_back', ''
    );
  ELSE
    -- Ensure all required fields exist with default empty string if missing
    NEW.documents := jsonb_build_object(
      'customer_photo', COALESCE((NEW.documents->>'customer_photo')::text, ''),
      'aadhar_front', COALESCE((NEW.documents->>'aadhar_front')::text, ''),
      'aadhar_back', COALESCE((NEW.documents->>'aadhar_back')::text, ''),
      'dl_front', COALESCE((NEW.documents->>'dl_front')::text, ''),
      'dl_back', COALESCE((NEW.documents->>'dl_back')::text, '')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for customers table
DROP TRIGGER IF EXISTS ensure_customer_documents_trigger ON customers;
CREATE TRIGGER ensure_customer_documents_trigger
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION ensure_customer_documents_structure();

-- Add trigger to maintain submitted_documents structure on bookings table
CREATE OR REPLACE FUNCTION ensure_booking_submitted_documents_structure()
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

-- Create trigger for bookings table
DROP TRIGGER IF EXISTS ensure_booking_submitted_documents_trigger ON bookings;
CREATE TRIGGER ensure_booking_submitted_documents_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION ensure_booking_submitted_documents_structure(); 