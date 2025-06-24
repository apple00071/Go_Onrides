-- Update submitted_documents field in bookings table
ALTER TABLE bookings
ALTER COLUMN submitted_documents SET DEFAULT '{
  "original_aadhar": false,
  "original_dl": false,
  "passport": false,
  "voter_id": false,
  "other_document": ""
}';

-- Add comment to explain the field
COMMENT ON COLUMN bookings.submitted_documents IS 'Tracks which physical documents have been submitted by the customer, including standard documents and one additional custom document field';

-- Update existing records to match new structure
UPDATE bookings
SET submitted_documents = jsonb_build_object(
  'original_aadhar', COALESCE((submitted_documents->>'original_aadhar')::boolean, false),
  'original_dl', COALESCE((submitted_documents->>'original_dl')::boolean, false),
  'passport', COALESCE((submitted_documents->>'passport')::boolean, false),
  'voter_id', COALESCE((submitted_documents->>'voter_id')::boolean, false),
  'other_document', ''
)
WHERE submitted_documents IS NOT NULL; 