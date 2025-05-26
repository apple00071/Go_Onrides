-- Insert or update admin profile
INSERT INTO profiles (id, email, role, permissions)
VALUES (
  '4cc2784a-a397-47de-8197-1544ac2f471a',
  'applegraphicshyd@gmail.com',
  'admin',
  '{
    "createBooking": true,
    "viewBookings": true,
    "uploadDocuments": true,
    "viewDocuments": true,
    "managePayments": true,
    "accessReports": true
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET 
  role = 'admin',
  permissions = '{
    "createBooking": true,
    "viewBookings": true,
    "uploadDocuments": true,
    "viewDocuments": true,
    "managePayments": true,
    "accessReports": true
  }'::jsonb; 