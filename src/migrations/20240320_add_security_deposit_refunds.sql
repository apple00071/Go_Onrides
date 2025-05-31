-- Add security deposit refund tracking to bookings table
ALTER TABLE bookings 
ADD COLUMN security_deposit_refunded BOOLEAN DEFAULT FALSE,
ADD COLUMN security_deposit_refund_date TIMESTAMP WITH TIME ZONE;

-- Create security deposit refunds table
CREATE TABLE security_deposit_refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    refund_amount DECIMAL(10,2) NOT NULL,
    refund_mode VARCHAR(50) NOT NULL,
    deductions DECIMAL(10,2) DEFAULT 0,
    deduction_reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
); 