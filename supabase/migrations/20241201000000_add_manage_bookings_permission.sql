-- Add manageBookings permission to existing profiles
UPDATE profiles 
SET permissions = permissions || '{"manageBookings": false}'::jsonb
WHERE permissions ? 'manageBookings' = false;

-- Update admin profiles to have manageBookings permission
UPDATE profiles 
SET permissions = permissions || '{"manageBookings": true}'::jsonb
WHERE role = 'admin';

-- Update default permissions in profiles table
ALTER TABLE profiles 
ALTER COLUMN permissions SET DEFAULT '{
  "createBooking": false,
  "viewBookings": true,
  "editBookings": false,
  "deleteBookings": false,
  "manageBookings": false,
  
  "createCustomer": false,
  "viewCustomers": true,
  "editCustomers": false,
  "deleteCustomers": false,
  
  "createVehicle": false,
  "viewVehicles": true,
  "editVehicles": false,
  "deleteVehicles": false,
  
  "createMaintenance": false,
  "viewMaintenance": true,
  "editMaintenance": false,
  "deleteMaintenance": false,
  
  "createInvoice": false,
  "viewInvoices": true,
  "editInvoices": false,
  "managePayments": false,
  
  "viewReports": false,
  "exportReports": false,
  
  "manageUsers": false,
  "manageSettings": false,
  "viewAuditLogs": false
}'::jsonb;
