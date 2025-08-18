-- First delete maintenance records
DELETE FROM vehicle_maintenance;

-- Then delete battery records
DELETE FROM vehicle_batteries;

-- Delete any maintenance-related files from storage
DELETE FROM storage.objects 
WHERE bucket_id = 'maintenance';

-- Reset vehicle maintenance dates
UPDATE vehicles
SET 
  last_maintenance_date = NULL,
  next_maintenance_date = NULL; 