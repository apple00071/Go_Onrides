-- Add missing columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS customer_name TEXT NULL,
ADD COLUMN IF NOT EXISTS customer_contact TEXT NULL,
ADD COLUMN IF NOT EXISTS customer_email TEXT NULL,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT NULL,
ADD COLUMN IF NOT EXISTS aadhar_number TEXT NULL,
ADD COLUMN IF NOT EXISTS date_of_birth DATE NULL,
ADD COLUMN IF NOT EXISTS dl_number TEXT NULL,
ADD COLUMN IF NOT EXISTS dl_expiry_date DATE NULL,
ADD COLUMN IF NOT EXISTS temp_address TEXT NULL,
ADD COLUMN IF NOT EXISTS perm_address TEXT NULL,
ADD COLUMN IF NOT EXISTS vehicle_details JSONB NULL,
ADD COLUMN IF NOT EXISTS rental_purpose TEXT NULL,
ADD COLUMN IF NOT EXISTS outstation_details JSONB NULL,
ADD COLUMN IF NOT EXISTS submitted_documents JSONB NULL,
ADD COLUMN IF NOT EXISTS start_date DATE NULL,
ADD COLUMN IF NOT EXISTS end_date DATE NULL,
ADD COLUMN IF NOT EXISTS pickup_time TEXT NULL,
ADD COLUMN IF NOT EXISTS dropoff_time TEXT NULL,
ADD COLUMN IF NOT EXISTS booking_amount DECIMAL(10,2) NULL,
ADD COLUMN IF NOT EXISTS security_deposit_amount DECIMAL(10,2) NULL,
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) NULL,
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) NULL,
ADD COLUMN IF NOT EXISTS payment_status TEXT NULL,
ADD COLUMN IF NOT EXISTS payment_mode TEXT NULL,
ADD COLUMN IF NOT EXISTS status TEXT NULL,
ADD COLUMN IF NOT EXISTS created_by UUID NULL;

-- Add helpful comments
COMMENT ON COLUMN bookings.customer_name IS 'Name of the customer';
COMMENT ON COLUMN bookings.customer_contact IS 'Contact number of the customer';
COMMENT ON COLUMN bookings.customer_email IS 'Email of the customer';
COMMENT ON COLUMN bookings.emergency_contact_phone IS 'Emergency contact number';
COMMENT ON COLUMN bookings.aadhar_number IS 'Aadhar card number';
COMMENT ON COLUMN bookings.date_of_birth IS 'Date of birth';
COMMENT ON COLUMN bookings.dl_number IS 'Driving license number';
COMMENT ON COLUMN bookings.dl_expiry_date IS 'Driving license expiry date';
COMMENT ON COLUMN bookings.temp_address IS 'Temporary address';
COMMENT ON COLUMN bookings.perm_address IS 'Permanent address';
COMMENT ON COLUMN bookings.vehicle_details IS 'JSON containing vehicle model and registration';
COMMENT ON COLUMN bookings.rental_purpose IS 'Purpose of rental (local/outstation)';
COMMENT ON COLUMN bookings.outstation_details IS 'JSON containing outstation specific details';
COMMENT ON COLUMN bookings.submitted_documents IS 'JSON containing submitted document details';
COMMENT ON COLUMN bookings.start_date IS 'Booking start date';
COMMENT ON COLUMN bookings.end_date IS 'Booking end date';
COMMENT ON COLUMN bookings.pickup_time IS 'Vehicle pickup time';
COMMENT ON COLUMN bookings.dropoff_time IS 'Vehicle dropoff time';
COMMENT ON COLUMN bookings.booking_amount IS 'Base booking amount';
COMMENT ON COLUMN bookings.security_deposit_amount IS 'Security deposit amount';
COMMENT ON COLUMN bookings.total_amount IS 'Total booking amount';
COMMENT ON COLUMN bookings.paid_amount IS 'Amount paid';
COMMENT ON COLUMN bookings.payment_status IS 'Payment status (pending/partial/full)';
COMMENT ON COLUMN bookings.payment_mode IS 'Mode of payment (cash/upi/card/bank_transfer)';
COMMENT ON COLUMN bookings.status IS 'Booking status (pending/confirmed/in_use/completed/cancelled)';
COMMENT ON COLUMN bookings.created_by IS 'UUID of the user who created the booking';

-- Add constraints for status and payment fields if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_rental_purpose_check') THEN
        ALTER TABLE bookings
        ADD CONSTRAINT bookings_rental_purpose_check CHECK (rental_purpose IN ('local', 'outstation'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_payment_status_check') THEN
        ALTER TABLE bookings
        ADD CONSTRAINT bookings_payment_status_check CHECK (payment_status IN ('pending', 'partial', 'full'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_payment_mode_check') THEN
        ALTER TABLE bookings
        ADD CONSTRAINT bookings_payment_mode_check CHECK (payment_mode IN ('cash', 'upi', 'card', 'bank_transfer'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_status_check') THEN
        ALTER TABLE bookings
        ADD CONSTRAINT bookings_status_check CHECK (status IN ('pending', 'confirmed', 'in_use', 'completed', 'cancelled'));
    END IF;
END $$; 