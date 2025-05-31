-- Add last payment date tracking to bookings table
ALTER TABLE bookings 
ADD COLUMN last_payment_date TIMESTAMP WITH TIME ZONE; 