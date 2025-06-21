-- Add submitted documents field to bookings table
ALTER TABLE bookings
ADD COLUMN submitted_documents jsonb NOT NULL DEFAULT '{
  "original_aadhar": false,
  "original_dl": false,
  "pan_card": false,
  "voter_id": false,
  "passport": false,
  "other_doc1": {"name": "", "submitted": false},
  "other_doc2": {"name": "", "submitted": false},
  "other_doc3": {"name": "", "submitted": false}
}';

-- Add comment to explain the field
COMMENT ON COLUMN bookings.submitted_documents IS 'Tracks which physical documents have been submitted by the customer, including standard and three additional custom document fields'; 