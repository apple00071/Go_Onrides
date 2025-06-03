-- Increase the varchar length for dropoff_time fields to accommodate time formats
ALTER TABLE booking_extensions 
ALTER COLUMN previous_dropoff_time TYPE VARCHAR(8),
ALTER COLUMN new_dropoff_time TYPE VARCHAR(8); 