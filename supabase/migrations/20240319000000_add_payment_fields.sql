-- Add payment-related columns to bookings table
ALTER TABLE bookings
ADD COLUMN total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN payment_status TEXT CHECK (payment_status IN ('full', 'partial', 'pending')) NOT NULL DEFAULT 'pending',
ADD COLUMN paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN payment_mode TEXT CHECK (payment_mode IN ('cash', 'upi', 'card', 'bank_transfer')) NOT NULL DEFAULT 'cash'; 