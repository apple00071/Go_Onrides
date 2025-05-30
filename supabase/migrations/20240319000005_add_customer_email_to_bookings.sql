-- Add customer_email column to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS customer_email text;

-- Update existing bookings with customer email from customers table
UPDATE bookings b
SET customer_email = c.email
FROM customers c
WHERE b.customer_id = c.id; 