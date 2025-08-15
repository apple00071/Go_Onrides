-- Update booking_extensions table
ALTER TABLE booking_extensions
ADD COLUMN IF NOT EXISTS payment_amount decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS previous_end_date date,
ADD COLUMN IF NOT EXISTS previous_dropoff_time varchar(10),
ADD COLUMN IF NOT EXISTS new_end_date date,
ADD COLUMN IF NOT EXISTS new_dropoff_time varchar(10),
ADD COLUMN IF NOT EXISTS additional_amount decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS reason text,
ADD COLUMN IF NOT EXISTS payment_method varchar(20) DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_booking_extensions_booking_id ON booking_extensions(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_extensions_created_by ON booking_extensions(created_by);
CREATE INDEX IF NOT EXISTS idx_booking_extensions_payment_method ON booking_extensions(payment_method);

-- Update bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS next_payment_date date,
ADD COLUMN IF NOT EXISTS dropoff_time varchar(10),
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Alter existing columns if they exist to increase length
ALTER TABLE booking_extensions 
ALTER COLUMN previous_dropoff_time TYPE varchar(10),
ALTER COLUMN new_dropoff_time TYPE varchar(10),
ALTER COLUMN payment_method TYPE varchar(20);

ALTER TABLE bookings
ALTER COLUMN dropoff_time TYPE varchar(10);

-- Add indexes for bookings table
CREATE INDEX IF NOT EXISTS idx_bookings_next_payment_date ON bookings(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_bookings_updated_by ON bookings(updated_by); 