-- First delete the maintenance records
DELETE FROM vehicle_maintenance;

-- Then delete the battery records since they're no longer referenced
DELETE FROM vehicle_batteries;

-- Reset the vehicle maintenance dates
UPDATE vehicles
SET last_maintenance_date = NULL,
    next_maintenance_date = NULL,
    updated_at = NOW();

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';