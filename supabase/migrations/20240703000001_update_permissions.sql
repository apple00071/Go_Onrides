-- Update default permissions in profiles table
ALTER TABLE profiles 
ALTER COLUMN permissions SET DEFAULT '{
  "createBooking": false,
  "viewBookings": true,
  "manageBookings": false,
  
  "createCustomer": false,
  "viewCustomers": true,
  "manageCustomers": false,
  
  "createVehicle": false,
  "viewVehicles": true,
  "manageVehicles": false,
  
  "createMaintenance": false,
  "viewMaintenance": true,
  "manageMaintenance": false,
  
  "createInvoice": false,
  "viewInvoices": true,
  "managePayments": false,
  
  "accessReports": false,
  "exportReports": false,
  
  "manageReturns": false,
  "viewReturns": true,
  
  "manageNotifications": false,
  "viewNotifications": true,
  
  "manageSettings": false
}'::jsonb;

-- Update existing admin profiles to have all permissions
UPDATE profiles
SET permissions = '{
  "createBooking": true,
  "viewBookings": true,
  "manageBookings": true,
  
  "createCustomer": true,
  "viewCustomers": true,
  "manageCustomers": true,
  
  "createVehicle": true,
  "viewVehicles": true,
  "manageVehicles": true,
  
  "createMaintenance": true,
  "viewMaintenance": true,
  "manageMaintenance": true,
  
  "createInvoice": true,
  "viewInvoices": true,
  "managePayments": true,
  
  "accessReports": true,
  "exportReports": true,
  
  "manageReturns": true,
  "viewReturns": true,
  
  "manageNotifications": true,
  "viewNotifications": true,
  
  "manageSettings": true
}'::jsonb
WHERE role = 'admin';

-- Update existing worker profiles to have basic view permissions
UPDATE profiles
SET permissions = '{
  "createBooking": false,
  "viewBookings": true,
  "manageBookings": false,
  
  "createCustomer": false,
  "viewCustomers": true,
  "manageCustomers": false,
  
  "createVehicle": false,
  "viewVehicles": true,
  "manageVehicles": false,
  
  "createMaintenance": false,
  "viewMaintenance": true,
  "manageMaintenance": false,
  
  "createInvoice": false,
  "viewInvoices": true,
  "managePayments": false,
  
  "accessReports": false,
  "exportReports": false,
  
  "manageReturns": false,
  "viewReturns": true,
  
  "manageNotifications": false,
  "viewNotifications": true,
  
  "manageSettings": false
}'::jsonb
WHERE role = 'worker'; 