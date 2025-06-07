-- Update default permissions in profiles table
ALTER TABLE profiles 
ALTER COLUMN permissions SET DEFAULT '{
  "createBooking": false,
  "viewBookings": true,
  "managePayments": false,
  "accessReports": false
}'::jsonb;

-- Update existing profiles to remove redundant permissions
UPDATE profiles
SET permissions = permissions - 'uploadDocuments' - 'viewDocuments' - 'editDocuments';

-- Update admin profiles to have the new simplified permission structure
UPDATE profiles
SET permissions = '{
  "createBooking": true,
  "viewBookings": true,
  "managePayments": true,
  "accessReports": true
}'::jsonb
WHERE role = 'admin';

-- Update worker profiles to have the new simplified permission structure
UPDATE profiles
SET permissions = '{
  "createBooking": false,
  "viewBookings": true,
  "managePayments": false,
  "accessReports": false
}'::jsonb
WHERE role = 'worker'; 